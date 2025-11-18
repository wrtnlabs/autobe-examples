import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a user can soft delete their own Todo item.
 *
 * Steps:
 *
 * 1. Register a new user and obtain a session token
 * 2. Create a Todo for this user
 * 3. Perform DELETE on /todoList/user/todos/{todoId}
 * 4. Validate that the response indicates the record is soft-deleted
 *
 *    - Status === 'deleted'
 *    - Deleted_at is set to an ISO8601 timestamp
 *    - Record data remains otherwise unchanged
 * 5. Repeat the DELETE (idempotency) and validate same result, no changes
 */
export async function test_api_todo_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // Step 1: register new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(10),
      href: "https://e2e-test.todo-list-app.local/signup",
      referrer: "https://e2e-test.todo-list-app.local/landing",
      ip: null,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(userJoin);

  // Step 2: create a Todo for that user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "pending",
    due_date: null,
  } satisfies ITodoListTodo.ICreate;
  const created = await api.functional.todoList.user.todos.create(connection, {
    body: todoCreateBody,
  });
  typia.assert(created);
  TestValidator.equals(
    "ownership - correct user",
    created.user.email,
    userEmail,
  );
  TestValidator.equals("initial status is pending", created.status, "pending");
  TestValidator.equals("not deleted", created.deleted_at, null);

  // Step 3: soft delete (1st request)
  const deleted1 = await api.functional.todoList.user.todos.erase(connection, {
    todoId: created.id,
  });
  typia.assert(deleted1);
  TestValidator.equals(
    "status becomes deleted after erase",
    deleted1.status,
    "deleted",
  );
  TestValidator.predicate(
    "deleted_at set",
    typeof deleted1.deleted_at === "string" && deleted1.deleted_at.length > 0,
  );
  TestValidator.equals("id unchanged after delete", deleted1.id, created.id);
  TestValidator.equals(
    "user unchanged after delete",
    deleted1.user,
    created.user,
    (key) => key === "updated_at",
  );

  // Step 4: idempotency check (repeat delete)
  const deleted2 = await api.functional.todoList.user.todos.erase(connection, {
    todoId: created.id,
  });
  typia.assert(deleted2);
  TestValidator.equals(
    "id unchanged after second delete",
    deleted2.id,
    created.id,
  );
  TestValidator.equals("still status deleted", deleted2.status, "deleted");
  TestValidator.equals(
    "deleted_at field unchanged",
    deleted2.deleted_at,
    deleted1.deleted_at,
  );
  TestValidator.equals(
    "user still matches after second delete",
    deleted2.user,
    created.user,
    (key) => key === "updated_at",
  );
}
