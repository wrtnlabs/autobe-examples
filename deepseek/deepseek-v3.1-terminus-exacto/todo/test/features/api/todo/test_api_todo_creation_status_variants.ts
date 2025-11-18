import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todos can be created with each allowed initial status ('pending',
 * 'completed', 'archived').
 *
 * 1. Register and authenticate a user
 * 2. For each allowed status value, create a todo with that status, random title,
 *    and optional random description
 * 3. Confirm the returned todo object has the same status as provided at creation
 *    and its system properties are set
 */
export async function test_api_todo_creation_status_variants(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const userEmail = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const userPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Status variants test
  const allowedStatuses = ["pending", "completed", "archived"] as const;
  for (const status of allowedStatuses) {
    const createBody = {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 2,
        wordMax: 8,
      }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
      status,
    } satisfies ITodoListTodo.ICreate;
    const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
      connection,
      { body: createBody },
    );
    typia.assert(todo);
    TestValidator.equals(
      `status should match for status '${status}'`,
      todo.status,
      status,
    );
    TestValidator.equals("title should match", todo.title, createBody.title);
    TestValidator.equals(
      "description should match",
      todo.description,
      createBody.description,
    );
    // Should have system properties set
    TestValidator.predicate(
      "todo id should be uuid",
      typeof todo.id === "string" && todo.id.length > 0,
    );
    TestValidator.predicate(
      "todo created_at is set",
      typeof todo.created_at === "string" && todo.created_at.length > 0,
    );
    TestValidator.equals(
      "todo_list_user_id matches user id",
      todo.todo_list_user_id,
      authorizedUser.id,
    );
  }
}
