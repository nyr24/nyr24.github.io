---
title: "Comparing reflection capabilities between C++ and C3"
description: "Comparing reflection capabilities between C++ and C3"
date: 2026-09-09
authors:
  - nyr24
---

<p>Reflection lets a program inspect and manipulate its own structure at runtime or compile time. Both C++ (with its upcoming reflection support) and C3 rely on compile-time reflection, so you can reason about types, enumerators, and struct members without any runtime cost. In this post I will compare how these two languages approach compile-time reflection.</p>

### What is C3?

<p>
  C3 is a relatively new programming language which mainly focuses on readability, performance, minimalism and familiarity to C / C++ programmers.
  <br/>
  It doesn't have heavy runtime, garbage collection, exceptions or RAII.
	<br/>
	It also fully supports C ABI compatibility out of the box.
</p>
<p>C3 uses special syntax for compile-time execution: all variables, control-flow constructs are prefixed with <b>$</b>. This was done on purpose to explicitly show the reader which code runs at compile time.
It uses <b>macros</b> for compile-time evaluation and reflection.</p>

<blockquote>
C3 macros are designed to provide a replacement for C preprocessor macros. They extend such macros by providing compile-time evaluation using constant folding, which offers an IDE friendly, limited, compile-time execution.
</blockquote>

Let's see both languages in action!

### Enum to string conversion

C++:
```cpp
enum class Color { Red, Green, Blue };

template <typename E>
constexpr std::string_view enum_to_string(E value) {
    template inline for (constexpr auto r : std::meta::enumerators_of(^^E)) {
        if (value == [:r:]) {
            return std::meta::identifier_of(r);
        }
    }
    return "Unknown";
}

int main()
{
  Color color = Color::Red;
  printf("%s", enum_to_string(color));

  return 0;
}
```

C3:
```c3
enum Color { RED, GREEN, BLUE }

macro String enum_to_string($enum_val)
{
		var $EnumType = $Typeof($enum_val);
		$foreach $val : $EnumType::values:
				$if $val == $enum_val:
						return $val.description;
				$endif
		$endforeach
}

fn void main()
{
		Color $color = RED;
		String $color_name = enum_to_string($color);
		io::printfn("%s", $color_name);
}
```

In C3 enums have special properties. For example, if you want to print enum value, it will print it in a readable form, exactly as defined in the source code.
For example this code: <code>io::printfn("%s", Color.RED)</code> will output RED, not 0.
<br/>
If you want to take the underlying value from an enum you can either access <code>.ordinal</code> or cast it to the underlying type.
<br/>
You can also associate value of any type with your enumerators:
```c3
enum Color : uint (String str_repr, char amount_of_red)
{
	RED  { "Red Color", 255 }
	BLUE { "Blue Color", 0 }
}

fn void log_color(Color c)
{
	io::printfn("%s %s", c.str_repr, c.amount_of_red); // Outputs: Red Color 255
}
```

Let's proceed with reflections!

### Struct introspection

C++:
```cpp
struct Person {
    std::string_view name;
    int age;
    double height;
};

template <typename T>
void print_struct_fields(const T& obj) {
    std::cout << std::meta::identifier_of(^^T) << " details:\n";

    template inline for (constexpr auto member : std::meta::nonstatic_data_members_of(^^T)) {
        constexpr std::string_view member_name = std::meta::identifier_of(member);
        std::cout << "  " << member_name << ": " << obj.[:member:] << "\n";
    }
}

int main() {
    Person alice{"Alice Smith", 30, 1.75};
    print_struct_fields(alice);
    /*
    Outputs:
    Person details:
      name: Alice Smith
      age: 30
      height: 1.75
    */
}
```

C3:
```c3
struct Person
{
	String name;
	int age;
	double height;
}

<*
 @require @kindof($val) == STRUCT : "Expected a struct" // (1)
*>
macro void print_struct_fields($val)
{
		var $Type = $Typeof($val);
		$foreach $field : $Type::members:
				io::printfn("\t%s: %s", $field.name, $val.$field);
		$endforeach
}

fn void main()
{
	  Person $alice = {"Alice Smith", 30, 1.75};
		io::printfn("Person details: ");
		print_struct_fields($alice);
		/*
	    Outputs:
			Person details:
			name: Alice Smith
			age: 30
			height: 1.750000
		*/
}
```
<p>
Here (1) C3 uses optional pre-conditions called 'contracts' which can help drastically with input validation.
They will be executed at compile-time if it is possible, if not - at runtime.
</p>

### Validation with compile-time only attributes
C++:
```c++
struct Range { int lo; int hi; }

struct Config
{
    [[=Range{ 1, 65535 }]]   int port;
    [[=Range{ 1, 256 }]]     int max_threads;
    [[=Range{ 100, 30000 }]] int timeout_ms;
}

template<typename T>
consexpr bool validate(const T& obj)
{
		constexpr auto context = std::meta::access_context::current();
		template for (constexpr auto member: define_static_array(
				nonstatic_data_members_of(^^T, context)) {
				template for (constexpr auto annotation : define_static_array(
						annotations_of_with_type(member, ^^Range))) {
						auto [lo, hi] = extract<Range>(annotation);
						if (obj.[:member:] < lo) return false;
						else if (obj.[:member:] > hi) return false;
				})
		return true;
}

static_assert(validate(Config{ 1000, 50, 20000 }));
static_assert(validate(Config{ 0, 0, 0 })); // Fails to compile.
```

C3:
```c3
struct Range { int lo; int hi; }

attrdef @Range(r) = @tag("range", r);

struct Config
{
    int port @Range({1, 65535});
    int max_threads @Range({1, 256});
    int timeout_ms @Range({100, 30000});
}

enum ValidationResult { TO_LOW, TO_HIGH, SUCCESS }

// (1)
macro ValidationResult validate_comptime($obj) @const
{
    var $Type = $Typeof($obj);

    $foreach $field : $Type::members:
	      $if $field.has_tag("range"):
		        Range $r = $field.get_tag("range");
		        $if $obj.$field < $r.lo:
								return TO_LOW;
						$endif
		        $if $obj.$field > $r.hi:
								return TO_HIGH;
						$endif
				$endif
		$endforeach
    return SUCCESS;
}

// (2)
macro ValidationResult validate_runtime(obj)
{
    var $Type = $Typeof(obj);
    Range r @noinit;

    $foreach $field : $Type::members:
        $if $field.has_tag("range"):
            r = $field.get_tag("range");
            if (obj.$field < r.lo) return TO_LOW;
            if (obj.$field > r.hi) return TO_HIGH;
        $endif
    $endforeach
    return SUCCESS;
}

fn void main()
{
		Config $c1 = { .port = 1000, .max_threads = 50, .timeout_ms = 20000 };
		Config $c2 = { .port = 0, .max_threads = 0, .timeout_ms = 0 };
		Config c1 = { .port = 1000, .max_threads = 50, .timeout_ms = 20000 };
		Config c2 = { .port = 0, .max_threads = 0, .timeout_ms = 0 };

		io::printn(validate_comptime($c1));
		io::printn(validate_comptime($c2));
		io::printn(validate_runtime(c1));
		io::printn(validate_runtime(c2));
		/*
		Outputs:
			SUCCESS
			TO_LOW
			SUCCESS
			TO_LOW
		*/
}
```

For this example with C3 I want to show you 2 options. In the first (1) variant we validate everything at compile-time, we can verify this easily by putting <code>@const</code> attribute on the macro.
In the second (2) variant we're mixing compile-time attributes with validation at runtime. In this example you can see how syntax distinction between <code>$if</code> and <code>if</code> helps to understand
which code gets expanded at compile-time and which will execute at runtime.

### Conclusions

<p>
  Both languages can do real compile-time reflection, which is great for serializers, debug printers, and generic helpers like the ones above.<br/>The tradeoff is ergonomics: C++ gets the power via verbose template machinery and splices,
  while C3 makes the same ideas more readable and expressive through its macro system and special syntax for compile-time execution,
  it's very easy to understand where code will execute at compile time and where it wouldn't.
</p>
<p>
  I've found C3 as very promising systems programming language, and I will do more posts about it soon.
  <br/>
  <b>Stay tuned!</b>
</p>
<p>You can search for more info about C3 on <a href="https://c3-lang.org">the main website</a>.
<br/>Want to discuss the language or have a question? Join official <a href="https://discord.gg/qN76R87">C3 server on Discord.</a></p>
