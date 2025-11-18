import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that todo titles with special characters, Unicode, and emoji are
 * properly handled without encoding issues or injection vulnerabilities.
 *
 * Tests comprehensive character support including:
 *
 * - Punctuation marks and symbols
 * - Unicode characters from multiple scripts (Latin, Cyrillic, Greek, Arabic,
 *   CJK)
 * - Emoji characters (basic to complex)
 * - HTML-like tags treated as plain text
 * - SQL-like syntax handled safely
 * - Mixed scripts and right-to-left text
 * - Edge cases like combining diacritics
 *
 * This ensures the API correctly stores and retrieves todo titles regardless of
 * character complexity, preventing encoding issues and security
 * vulnerabilities.
 */
export async function test_api_todo_creation_special_characters_in_title(
  connection: api.IConnection,
) {
  // Step 1: Create a user account for todo creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(12),
        href: "http://localhost/auth",
        referrer: "http://localhost/",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Test special characters and symbols
  const specialCharTitles = [
    "Task with ! @ # $ % ^ & * ( ) - _ = + [ ] { } ; : ' \" , . < > ? / | \\ special chars",
    "SQL injection test: ' OR '1'='1'; DROP TABLE todos; --",
    "HTML injection: <script>alert('xss')</script> and <div>content</div>",
    "Quote test: \"double\" and 'single' and `backtick` quotes",
  ];

  for (const title of specialCharTitles) {
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: {
          title: title,
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    TestValidator.equals("special characters preserved", todo.title, title);
  }

  // Step 3: Test Unicode characters from various scripts
  const unicodeTitles = [
    "Latin: café, naïve, résumé",
    "Cyrillic: Привет мир (Hello world)",
    "Greek: Γεια σας κόσμε (Hello world)",
    "Arabic: مرحبا بالعالم (Hello world)",
    "Hebrew: שלום עולם (Hello world)",
    "Chinese: 你好世界 (Hello world)",
    "Japanese: こんにちは世界 (Hello world)",
    "Korean: 안녕하세요 세계 (Hello world)",
    "Thai: สวัสดีชาวโลก (Hello world)",
    "Devanagari: नमस्ते दुनिया (Hello world)",
  ];

  for (const title of unicodeTitles) {
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: {
          title: title,
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    TestValidator.equals("Unicode characters preserved", todo.title, title);
  }

  // Step 4: Test emoji characters
  const emojiTitles = [
    "Basic emoji: 😀 😃 😄 😁 😆 😅 🤣",
    "Objects: 🎉 🎊 🎈 🎁 🎀 🎯",
    "Animals: 🐶 🐱 🐭 🐹 🐰 🦊 🐻",
    "Nature: 🌲 🌳 🌴 🌵 🌾 🌿 🍀",
    "Food: 🍕 🍔 🍟 🌭 🍿 🥤 🍷",
    "Activities: ⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐",
    "Complex emoji with modifiers: 👨‍👩‍👧‍👦 👩‍💻 👨‍⚕️ 🧑‍🚀",
    "Emoji sequences: 🏳️‍🌈 🏳️‍⚧️",
  ];

  for (const title of emojiTitles) {
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: {
          title: title,
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    TestValidator.equals("emoji characters preserved", todo.title, title);
  }

  // Step 5: Test mixed scripts
  const mixedScriptTitles = [
    "English + Cyrillic: Hello Привет Mixed мир",
    "English + Arabic: Hello مرحبا World عالم",
    "English + Chinese: Hello 你好 Task 任务",
    "English + Japanese: Hello こんにちは Task タスク",
    "Cyrillic + Arabic: Привет مرحبا",
    "Chinese + Japanese + Korean: 中文 日本語 한국어",
  ];

  for (const title of mixedScriptTitles) {
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: {
          title: title,
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    TestValidator.equals("mixed scripts preserved", todo.title, title);
  }

  // Step 6: Test combining diacritics and special Unicode
  const diacriticTitles = [
    "Combining diacritics: e̊ o̜ u̐",
    "Zero-width characters test",
    "Accents and diacritics: à á â ã ä å ē ė ę",
    "Mathematical operators: ∑ ∏ ∫ √ ∞ ≠ ≤ ≥",
    "Arrows: → ← ↑ ↓ ↔ ↕",
  ];

  for (const title of diacriticTitles) {
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: {
          title: title,
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    TestValidator.equals("diacritics preserved", todo.title, title);
  }

  // Step 7: Test RTL (Right-to-Left) text
  const rtlTitles = [
    "Arabic RTL: مهمة من اليسار إلى اليمين",
    "Hebrew RTL: משימה מימין לשמאל",
    "Mixed LTR+RTL: English and عربي and Hebrew",
  ];

  for (const title of rtlTitles) {
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      {
        body: {
          title: title,
        } satisfies ITodoListTodo.ICreate,
      },
    );
    typia.assert(todo);
    TestValidator.equals("RTL text preserved", todo.title, title);
  }

  // Step 8: Test at maximum length with special characters
  const longSpecialTitle =
    "🎉".repeat(50) + " " + "café".repeat(10) + " مرحبا".repeat(5);
  const longTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: longSpecialTitle.substring(0, 255), // Respect max length constraint
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(longTodo);
  TestValidator.equals(
    "long special character string preserved",
    longTodo.title,
    longSpecialTitle.substring(0, 255),
  );
}
