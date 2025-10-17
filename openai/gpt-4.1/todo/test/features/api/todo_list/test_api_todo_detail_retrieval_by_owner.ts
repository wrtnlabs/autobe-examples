import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate detailed retrieval of a user's own Todo item.
 *
 * This test confirms that an authenticated user can register, create a Todo,
 * then retrieve the full details (including id, title, description, completed,
 * created_at, updated_at, completed_at, owner) of that Todo using the API. It
 * verifies that the response fields are present and correct, and that the Todo
 * is linked only to the authenticated creator. The flow is:
 *
 * 1. Register a new user with unique email and valid password.
 * 2. Create a Todo for that user (using title and description).
 * 3. Retrieve details for the created Todo by its id using the authenticated
 *    session.
 * 4. Validate that the entire Todo response matches expectations and ownership is
 *    enforced.
 */
export async function test_api_todo_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.MaxLength<72>,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(userJoin);
  // 2. Create a Todo as this user
  const todoCreate = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 16,
        }) as string & tags.MinLength<1> & tags.MaxLength<100>,
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 2,
          wordMax: 8,
        }) as string & tags.MaxLength<500>,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todoCreate);
  // 3. Retrieve detailed Todo by ID
  const todoDetail = await api.functional.todoList.user.todos.at(connection, {
    todoId: todoCreate.id,
  });
  typia.assert(todoDetail);
  // 4. Validate all details and ownership
  TestValidator.equals(
    "detail id matches created id",
    todoDetail.id,
    todoCreate.id,
  );
  TestValidator.equals(
    "detail title is correct",
    todoDetail.title,
    todoCreate.title,
  );
  TestValidator.equals(
    "detail description is correct",
    todoDetail.description ?? null,
    todoCreate.description ?? null,
  );
  TestValidator.equals(
    "completed status is false by default",
    todoDetail.completed,
    false,
  );
  TestValidator.equals(
    "owner is authenticated user",
    todoDetail.todo_list_user_id,
    userJoin.id,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof todoDetail.created_at === "string" &&
      !isNaN(Date.parse(todoDetail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof todoDetail.updated_at === "string" &&
      !isNaN(Date.parse(todoDetail.updated_at)),
  );
  TestValidator.equals(
    "completed_at null when incomplete",
    todoDetail.completed_at ?? null,
    null,
  );
}
