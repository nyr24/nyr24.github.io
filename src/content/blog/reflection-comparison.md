---
title: "Comparing reflection capabilities between C++ and C3"
description: "Comparing reflection capabilities between C++ and C3"
date: 2026-09-09
authors:
  - nyr24
---

<p>Reflection lets a program inspect and manipulate its own structure at runtime or compile time. Both C++ (with its upcoming reflection support) and C3 rely on compile-time reflection, so you can reason about types, enumerators, and struct members without any runtime cost. In this post I compare how the two languages approach this — walking through an enum-to-string helper and struct introspection side by side, and finishing with a bonus look at what C3's macro reflection can do beyond those basics.</p>
<p>
 C3 is a general-purpose programming language with systems-level performance.
 It builds on the syntax and semantics of the C language, bringing modern ergonomics and ease of development while remaining simple and familiar to C/C++ programmers.
</p>
<p>C3 uses a special syntax for compile-time execution; this was done on purpose to explicitly show the reader which code runs at compile time.</p>

<blockquote>
C3 macros are designed to provide a replacement for C preprocessor macros. They extend such macros by providing compile time evaluation using constant folding, which offers an IDE friendly, limited, compile time execution.
However, if you are doing more complex compile time code generation it is recommended to use $exec and related techniques to generate code in external scripts instead.
</blockquote>

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

// C3 uses optional pre-conditions to validate inputs.
// They're called contracts.
// They will run at compile time if possible, otherwise at runtime.
// I will discuss them more in a separate blog post.
<*
 @require @kindof($val) == STRUCT : "Expected a struct"
*>
macro void print_struct_fields($val)
{
	var $Type = $Typeof($val);
	$foreach $mem : $Type::members:
		io::printfn("\t%s: %s", $mem.name, $val.$mem);
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

### C3 bonus example
```c3
macro do_fancy_stuff(val)
{
	var $Type = $Typeof(val);
	$switch:
	$case types::is_numerical($Type):
		return val * val;
	$case types::is_same($Type, DString):
		val.append(", to C3!");
		return;
	$case @kindof(val) == STRUCT:
		io::printfn("You're passed a struct!");
		return;
	$endswitch
}

fn void main()
{
	int n = 255;
	Person p = { "Brad", 35, 1.7 };
	DString str;
	str.tinit(100);
	str.append("Hello");

	n = do_fancy_stuff(n);
	do_fancy_stuff(str);
	do_fancy_stuff(p);

	io::printfn("%s\n%s", n, str);
	/*
	Outputs:
	You're passed a struct!
	65025
	Hello, to C3!
	*/
}
```

<p>Both languages can do real compile-time reflection, which is great for serializers, debug printers, and generic helpers like the ones above.<br/>The tradeoff is ergonomics: C++ gets the power via verbose template machinery and splices, while C3 makes the same ideas more readable and expressive through its macro system.</p>
<p>You can search for more info about C3 on <a href="https://c3-lang.org">the main website</a>.
<br/>Want to discuss the language or have a question? Join official <a href="https://discord.gg/qN76R87">C3 server on Discord.</a></p>
