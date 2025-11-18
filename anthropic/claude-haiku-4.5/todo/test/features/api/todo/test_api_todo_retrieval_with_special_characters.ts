import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of todos containing special characters and Unicode.
 *
 * This test validates that the API correctly handles and preserves special
 * characters, emoji, and Unicode text in todo items throughout the complete
 * create-retrieve workflow. The test ensures no character corruption, proper
 * encoding/decoding, and round-trip integrity for diverse international and
 * special character sets.
 *
 * Test process:
 *
 * 1. Register new user account for authentication
 * 2. Create todo with comprehensive special characters including:
 *
 *    - Emoji (🎉, 🚀, 💯, 🌟, etc.)
 *    - Special punctuation (!@#$%^&*()_+-=[]{}|;:,.<>?)
 *    - Unicode from multiple scripts (Cyrillic, Arabic, CJK, Hebrew, Greek)
 *    - Mathematical symbols and operators
 *    - Currency symbols (€, £, ¥, ₹)
 *    - Combining marks and accented characters (é, ñ, ü, etc.)
 * 3. Retrieve created todo by ID
 * 4. Verify all special characters preserved without corruption
 * 5. Compare retrieved data with original for round-trip integrity
 * 6. Validate proper encoding across all character types
 */
export async function test_api_todo_retrieval_with_special_characters(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "TestPassword123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todo with comprehensive special characters
  const specialCharactersTitle =
    "🎉 Test Todo: Special!@#$%^&*()_+-=[]{}|;:,.<>? Chars";
  const unicodeTitle = "Тест 测试 اختبار בדיקה δοκιμή Ñoño Café Über Привет";
  const emoji = "🚀 💯 🌟 ✨ 🎨 🎭 🎪 🎬 🎤 🎧 🎮 🎯 🎲 🎳 🏆 🏅 ⭐ 💫";
  const mathematicalSymbols = "∑ ∏ ∫ √ ∞ ± × ÷ ≈ ≠ ≤ ≥ ⇒ ⇔ ∈ ∉ ∀ ∃";
  const currencySymbols = "€ £ ¥ ₹ ₽ ₩ ₪ ₨ ₱ ₡ ₦ ₱ ฿ ₴";
  const combinedTitle = `${specialCharactersTitle} | ${unicodeTitle} | ${emoji} | ${mathematicalSymbols} | ${currencySymbols}`;
  const combinedDescription = `Description with special chars: ${specialCharactersTitle}
Advanced Unicode: ${unicodeTitle}
Mathematical: ${mathematicalSymbols}
Currency: ${currencySymbols}
Emoji variety: ${emoji}
Additional: Ăăąą Ććĉĉ Ďď Ĕĕ Ėė Ğğ Ĝĝ Ħħ Ĥĥ`;

  const todoCreate = {
    title: combinedTitle,
    description: combinedDescription,
    priority: "high" as const,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoCreate,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo title preserves special characters",
    createdTodo.title,
    combinedTitle,
  );
  TestValidator.equals(
    "created todo description preserves special characters",
    createdTodo.description,
    combinedDescription,
  );

  // Step 3: Retrieve the created todo by ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Step 4: Verify all special characters are preserved without corruption
  TestValidator.equals(
    "retrieved todo ID matches created todo",
    retrievedTodo.id,
    createdTodo.id,
  );

  TestValidator.equals(
    "retrieved todo title matches original with all special characters preserved",
    retrievedTodo.title,
    combinedTitle,
  );

  TestValidator.equals(
    "retrieved todo description matches original with all special characters preserved",
    retrievedTodo.description,
    combinedDescription,
  );

  // Step 5: Comprehensive round-trip validation
  TestValidator.equals(
    "retrieved todo title matches created todo title character-for-character",
    retrievedTodo.title,
    createdTodo.title,
  );

  TestValidator.equals(
    "retrieved todo description matches created todo description character-for-character",
    retrievedTodo.description,
    createdTodo.description,
  );

  // Step 6: Verify emoji preservation
  TestValidator.predicate("emoji characters are preserved in title", () =>
    retrievedTodo.title.includes("🎉"),
  );
  TestValidator.predicate(
    "emoji characters are preserved in description",
    () => retrievedTodo.description?.includes("🚀") ?? false,
  );

  // Step 7: Verify Unicode script preservation
  TestValidator.predicate("Cyrillic characters preserved", () =>
    retrievedTodo.title.includes("Тест"),
  );
  TestValidator.predicate("CJK characters preserved", () =>
    retrievedTodo.title.includes("测试"),
  );
  TestValidator.predicate("Arabic characters preserved", () =>
    retrievedTodo.title.includes("اختبار"),
  );
  TestValidator.predicate("Hebrew characters preserved", () =>
    retrievedTodo.title.includes("בדיקה"),
  );
  TestValidator.predicate("Greek characters preserved", () =>
    retrievedTodo.title.includes("δοκιμή"),
  );

  // Step 8: Verify special punctuation
  TestValidator.predicate(
    "special punctuation preserved",
    () =>
      retrievedTodo.title.includes("!") &&
      retrievedTodo.title.includes("@") &&
      retrievedTodo.title.includes("#") &&
      retrievedTodo.title.includes("$") &&
      retrievedTodo.title.includes("%") &&
      retrievedTodo.title.includes("^") &&
      retrievedTodo.title.includes("&") &&
      retrievedTodo.title.includes("*"),
  );

  // Step 9: Verify mathematical symbols
  TestValidator.predicate(
    "mathematical symbols preserved in description",
    () => retrievedTodo.description?.includes("∑") ?? false,
  );

  // Step 10: Verify currency symbols
  TestValidator.predicate(
    "currency symbols preserved in description",
    () =>
      (retrievedTodo.description?.includes("€") ?? false) &&
      (retrievedTodo.description?.includes("£") ?? false) &&
      (retrievedTodo.description?.includes("¥") ?? false),
  );

  // Step 11: Complete data structure validation
  typia.assert(retrievedTodo);
  TestValidator.predicate("todo has valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedTodo.id,
    ),
  );
  TestValidator.predicate(
    "todo has created_at timestamp",
    () => retrievedTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "todo has updated_at timestamp",
    () => retrievedTodo.updated_at !== undefined,
  );
}
