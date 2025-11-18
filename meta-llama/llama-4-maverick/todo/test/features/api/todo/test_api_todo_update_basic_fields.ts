import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test updating a todo's title, description, due date, and priority for an
 * existing todo owned by the user. Validates ownership-based access,
 * persistence of changes, and audit field updates. Only the owner may update,
 * and only requested fields change.
 */
export async function test_api_todo_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register a user (owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(10);
  const ownerJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies ITodoUser.ICreate,
  });
  typia.assert(ownerJoin);

  // 2. Create a todo for this user
  const todoCreate = await api.functional.todo.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 10,
      }),
      description: RandomGenerator.paragraph({
        sentences: 8,
        wordMin: 6,
        wordMax: 15,
      }),
      due_date: new Date(Date.now() + 86400 * 1000 * 5).toISOString(),
      priority: RandomGenerator.pick(["low", "medium", "high"] as const),
    } satisfies ITodoTodo.ICreate,
  });
  typia.assert(todoCreate);

  // 3. Update the todo's title, description, due_date, and priority
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 6,
    wordMax: 20,
  });
  const updatedDueDate = new Date(Date.now() + 86400 * 1000 * 10).toISOString();
  const updatedPriority = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);

  const updated = await api.functional.todo.user.todos.update(connection, {
    todoId: todoCreate.id,
    body: {
      title: updatedTitle,
      description: updatedDescription,
      due_date: updatedDueDate,
      priority: updatedPriority,
    } satisfies ITodoTodo.IUpdate,
  });
  typia.assert(updated);

  // 4. Assert updated fields match
  TestValidator.equals("todo title updated", updated.title, updatedTitle);
  TestValidator.equals(
    "todo description updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "todo due_date updated",
    updated.due_date,
    updatedDueDate,
  );
  TestValidator.equals(
    "todo priority updated",
    updated.priority,
    updatedPriority,
  );

  // 5. Confirm audit field 'updated_at' is updated and differs from original
  TestValidator.notEquals(
    "updated_at has changed",
    updated.updated_at,
    todoCreate.updated_at,
  );

  // 6. Register a different user, attempt unauthorized update
  const hackerEmail = typia.random<string & tags.Format<"email">>();
  const hackerPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.user.join(connection, {
    body: {
      email: hackerEmail,
      password: hackerPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies ITodoUser.ICreate,
  });

  await TestValidator.error("non-owner cannot update todo", async () => {
    await api.functional.todo.user.todos.update(connection, {
      todoId: todoCreate.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies ITodoTodo.IUpdate,
    });
  });
}
