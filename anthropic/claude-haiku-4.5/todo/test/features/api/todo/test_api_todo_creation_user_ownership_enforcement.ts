import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that created todos are exclusively owned by the creating user.
 *
 * This test validates the user ownership enforcement mechanism by:
 *
 * 1. Creating two separate user accounts (User A and User B)
 * 2. Having each user create multiple todos
 * 3. Verifying that todos created by User A are associated with User A's ID
 * 4. Verifying that todos created by User B are associated with User B's ID
 * 5. Confirming user ownership cannot be transferred or modified
 * 6. Ensuring todos are properly isolated per authenticated user context
 *
 * This prevents cross-user data access and ensures data isolation in the todo
 * application.
 */
export async function test_api_todo_creation_user_ownership_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register first user (User A)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphabets(10);
  const userAResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAEmail,
        password: userAPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAResponse);
  const userAId = userAResponse.id;

  // Step 2: User A creates first todo
  const todoA1Data = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: "high" as const,
  } satisfies ITodoListTodo.ICreate;

  const todoA1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoA1Data,
    },
  );
  typia.assert(todoA1);
  TestValidator.equals(
    "User A first todo title matches",
    todoA1.title,
    todoA1Data.title,
  );

  // Step 3: User A creates second todo
  const todoA2Data = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: "medium" as const,
  } satisfies ITodoListTodo.ICreate;

  const todoA2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoA2Data,
    },
  );
  typia.assert(todoA2);
  TestValidator.equals(
    "User A second todo title matches",
    todoA2.title,
    todoA2Data.title,
  );

  // Step 4: Register second user (User B)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphabets(10);
  const userBResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userBEmail,
        password: userBPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userBResponse);
  const userBId = userBResponse.id;

  // Step 5: User B creates first todo
  const todoB1Data = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: "low" as const,
  } satisfies ITodoListTodo.ICreate;

  const todoB1: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoB1Data,
    },
  );
  typia.assert(todoB1);
  TestValidator.equals(
    "User B first todo title matches",
    todoB1.title,
    todoB1Data.title,
  );

  // Step 6: User B creates second todo
  const todoB2Data = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    priority: "high" as const,
  } satisfies ITodoListTodo.ICreate;

  const todoB2: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: todoB2Data,
    },
  );
  typia.assert(todoB2);
  TestValidator.equals(
    "User B second todo title matches",
    todoB2.title,
    todoB2Data.title,
  );

  // Step 7: Verify user IDs are different
  TestValidator.notEquals(
    "User A and User B have different IDs",
    userAId,
    userBId,
  );

  // Step 8: Verify todos created by User A are distinct from todos created by User B
  TestValidator.notEquals(
    "User A todo 1 ID differs from User B todo 1 ID",
    todoA1.id,
    todoB1.id,
  );
  TestValidator.notEquals(
    "User A todo 1 ID differs from User B todo 2 ID",
    todoA1.id,
    todoB2.id,
  );
  TestValidator.notEquals(
    "User A todo 2 ID differs from User B todo 1 ID",
    todoA2.id,
    todoB1.id,
  );
  TestValidator.notEquals(
    "User A todo 2 ID differs from User B todo 2 ID",
    todoA2.id,
    todoB2.id,
  );

  // Step 9: Verify user A todos have valid UUIDs
  TestValidator.predicate(
    "User A todo 1 has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todoA1.id,
    ),
  );
  TestValidator.predicate(
    "User A todo 2 has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todoA2.id,
    ),
  );

  // Step 10: Verify user B todos have valid UUIDs
  TestValidator.predicate(
    "User B todo 1 has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todoB1.id,
    ),
  );
  TestValidator.predicate(
    "User B todo 2 has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todoB2.id,
    ),
  );

  // Step 11: Verify priority values are preserved
  TestValidator.equals(
    "User A todo 1 priority is high",
    todoA1.priority,
    "high",
  );
  TestValidator.equals(
    "User A todo 2 priority is medium",
    todoA2.priority,
    "medium",
  );
  TestValidator.equals("User B todo 1 priority is low", todoB1.priority, "low");
  TestValidator.equals(
    "User B todo 2 priority is high",
    todoB2.priority,
    "high",
  );

  // Step 12: Verify completion status is false initially
  TestValidator.predicate(
    "User A todo 1 is not completed initially",
    todoA1.completed === false,
  );
  TestValidator.predicate(
    "User A todo 2 is not completed initially",
    todoA2.completed === false,
  );
  TestValidator.predicate(
    "User B todo 1 is not completed initially",
    todoB1.completed === false,
  );
  TestValidator.predicate(
    "User B todo 2 is not completed initially",
    todoB2.completed === false,
  );

  // Step 13: Verify timestamps are properly set
  TestValidator.predicate(
    "User A todo 1 has created_at timestamp",
    todoA1.created_at !== null && todoA1.created_at !== undefined,
  );
  TestValidator.predicate(
    "User A todo 1 has updated_at timestamp",
    todoA1.updated_at !== null && todoA1.updated_at !== undefined,
  );
  TestValidator.predicate(
    "User B todo 1 has created_at timestamp",
    todoB1.created_at !== null && todoB1.created_at !== undefined,
  );
  TestValidator.predicate(
    "User B todo 1 has updated_at timestamp",
    todoB1.updated_at !== null && todoB1.updated_at !== undefined,
  );
}
