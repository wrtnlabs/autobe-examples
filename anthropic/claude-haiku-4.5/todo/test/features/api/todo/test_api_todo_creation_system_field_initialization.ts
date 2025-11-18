import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that system-generated fields are properly initialized on todo creation.
 *
 * This test validates that when a new todo item is created, all
 * system-generated fields are correctly set: id is a valid UUID, created_at and
 * updated_at are set to the current time (or very close to it), and
 * completed_at is null (since the todo is not yet completed). It also verifies
 * that these timestamps are in ISO 8601 format. The test creates multiple todos
 * and validates that each receives a unique id to ensure no collisions occur.
 *
 * Workflow:
 *
 * 1. Authenticate user for authorization
 * 2. Create first todo item with basic data
 * 3. Validate system fields initialization (id, created_at, updated_at,
 *    completed_at)
 * 4. Create additional todo items to verify unique id generation
 * 5. Validate all ids are unique
 * 6. Verify timestamp values are correctly initialized
 * 7. Verify completed_at is null for non-completed todos
 */
export async function test_api_todo_creation_system_field_initialization(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2 & 3: Create first todo and validate system fields
  const currentTime = new Date();
  const firstTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "high" as const,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(firstTodo);

  // Validate first todo's system fields
  TestValidator.predicate(
    "completed should be false for new todo",
    firstTodo.completed === false,
  );

  TestValidator.equals(
    "completed_at should be null for new todo",
    firstTodo.completed_at,
    null,
  );

  TestValidator.predicate("created_at should be close to current time", () => {
    const createdDate = new Date(firstTodo.created_at);
    const timeDiff = Math.abs(createdDate.getTime() - currentTime.getTime());
    return timeDiff < 5000; // Within 5 seconds
  });

  TestValidator.predicate(
    "updated_at should equal created_at for new todo",
    firstTodo.updated_at === firstTodo.created_at,
  );

  // Step 4 & 5: Create multiple todos and verify unique ids
  const todos = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: RandomGenerator.pick(["low", "medium", "high"] as const),
      } satisfies ITodoListTodo.ICreate,
    });
  });

  const allTodos = [firstTodo, ...todos];
  const ids = allTodos.map((todo) => todo.id);

  TestValidator.predicate(
    "all todo ids should be unique",
    () => new Set(ids).size === ids.length,
  );

  // Step 6 & 7: Verify timestamps and system fields for all created todos
  await ArrayUtil.asyncForEach(todos, async (todo, index) => {
    typia.assert(todo);

    TestValidator.predicate(
      `todo ${index + 1} completed should be false`,
      todo.completed === false,
    );

    TestValidator.equals(
      `todo ${index + 1} completed_at should be null`,
      todo.completed_at,
      null,
    );

    TestValidator.predicate(
      `todo ${index + 1} created_at should be close to current time`,
      () => {
        const createdDate = new Date(todo.created_at);
        const timeDiff = Math.abs(
          createdDate.getTime() - currentTime.getTime(),
        );
        return timeDiff < 10000; // Within 10 seconds
      },
    );

    TestValidator.predicate(
      `todo ${index + 1} updated_at should equal created_at`,
      todo.updated_at === todo.created_at,
    );
  });
}
