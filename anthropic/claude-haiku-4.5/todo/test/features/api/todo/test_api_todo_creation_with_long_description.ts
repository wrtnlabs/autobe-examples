import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo creation with maximum length description (5000 characters).
 *
 * This test validates the description field length constraints:
 *
 * - Maximum length of 5000 characters is enforced
 * - Descriptions at exactly 5000 characters are accepted
 * - Descriptions at 4999 characters (within limit) are accepted
 * - Descriptions exceeding 5000 characters are rejected
 *
 * The test flow:
 *
 * 1. Create new user account for authentication
 * 2. Create todo with exactly 5000 character description
 * 3. Verify todo stored with complete description
 * 4. Create todo with 4999 character description
 * 5. Verify sub-maximum description is accepted
 * 6. Attempt to create todo with 5001+ character description
 * 7. Confirm validation rejects oversized descriptions
 */
export async function test_api_todo_creation_with_long_description(
  connection: api.IConnection,
) {
  // Step 1: Register new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "password123456",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todo with exactly 5000 character description (maximum allowed)
  const maxLengthDescription = "a".repeat(5000);
  const todoMaxLength: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Todo with maximum description length",
        description: maxLengthDescription,
        priority: "high",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoMaxLength);

  // Step 3: Verify the created todo has the exact 5000 character description
  TestValidator.equals(
    "todo description length should be exactly 5000 characters",
    todoMaxLength.description?.length ?? 0,
    5000,
  );
  TestValidator.equals(
    "todo description content should match input",
    todoMaxLength.description,
    maxLengthDescription,
  );
  TestValidator.predicate(
    "maximum length todo should have valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todoMaxLength.id,
    ),
  );

  // Step 4: Create todo with 4999 character description (within limit)
  const subMaxLengthDescription = "b".repeat(4999);
  const todoSubMaxLength: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "Todo with sub-maximum description length",
        description: subMaxLengthDescription,
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoSubMaxLength);

  // Step 5: Verify sub-maximum description is accepted and stored correctly
  TestValidator.equals(
    "sub-maximum description length should be exactly 4999 characters",
    todoSubMaxLength.description?.length ?? 0,
    4999,
  );
  TestValidator.equals(
    "sub-maximum description content should match input",
    todoSubMaxLength.description,
    subMaxLengthDescription,
  );
  TestValidator.predicate(
    "sub-maximum length todo should have valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todoSubMaxLength.id,
    ),
  );

  // Step 6: Attempt to create todo with 5001 character description (exceeds limit)
  const oversizeLengthDescription = "c".repeat(5001);
  await TestValidator.error(
    "description exceeding 5000 characters should be rejected",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          title: "Todo with oversized description",
          description: oversizeLengthDescription,
          priority: "low",
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );

  // Step 7: Verify both todos have correct properties
  TestValidator.predicate(
    "maximum length todo title should match input",
    todoMaxLength.title === "Todo with maximum description length",
  );
  TestValidator.predicate(
    "maximum length todo should be incomplete by default",
    todoMaxLength.completed === false,
  );
  TestValidator.predicate(
    "maximum length todo priority should be high",
    todoMaxLength.priority === "high",
  );
  TestValidator.predicate(
    "sub-maximum length todo title should match input",
    todoSubMaxLength.title === "Todo with sub-maximum description length",
  );
  TestValidator.predicate(
    "sub-maximum length todo should be incomplete by default",
    todoSubMaxLength.completed === false,
  );
  TestValidator.predicate(
    "sub-maximum length todo priority should be medium",
    todoSubMaxLength.priority === "medium",
  );
}
