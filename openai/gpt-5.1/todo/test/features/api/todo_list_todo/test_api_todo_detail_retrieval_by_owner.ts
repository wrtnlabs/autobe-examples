import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that an authenticated user can retrieve complete details for their
 * own todo item by todoId.
 *
 * 1. Register a new user for the test, using unique random email and valid
 *    password, and fill in required session/context fields.
 * 2. As that user (with authenticated context), create a new todo via POST
 *    /todoList/user/todos, providing valid title (1-100 chars), optional
 *    description (nullable or omitted), and a due_date set to a future ISO 8601
 *    string.
 * 3. Retrieve the todo's detail using GET /todoList/user/todos/{todoId}.
 * 4. Assert all detail fields (title, description, due_date, completed status,
 *    creation/update timestamps, and owner id) match between initial creation
 *    and retrieval.
 * 5. Confirm ownership via matching todo_list_user_id and that completed is false
 *    by default.
 */
export async function test_api_todo_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user for the test, using unique random email and valid password, and fill required session/context fields.
  const userJoin = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test-e2e-case.com/registration",
    referrer: "https://test-e2e-case.com/landing",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "registered email should match input",
    authorized.email,
    userJoin.email,
  );

  // 2. As this user, create a todo (with valid required and optional fields)
  const todoToCreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 8,
      wordMin: 2,
      wordMax: 12,
    }),
    due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days in future
  } satisfies ITodoListTodo.ICreate;
  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: todoToCreate,
    });
  typia.assert(createdTodo);
  TestValidator.equals(
    "created title should match",
    createdTodo.title,
    todoToCreate.title,
  );
  TestValidator.equals(
    "created description should match",
    createdTodo.description,
    todoToCreate.description,
  );
  TestValidator.equals(
    "created due date should match",
    createdTodo.due_date,
    todoToCreate.due_date,
  );
  TestValidator.equals(
    "created todo should belong to user",
    createdTodo.todo_list_user_id,
    authorized.id,
  );
  TestValidator.equals(
    "completed should default to false",
    createdTodo.completed,
    false,
  );

  // 3. Retrieve the todo's detail using GET /todoList/user/todos/{todoId}
  const fetched: ITodoListTodo = await api.functional.todoList.user.todos.at(
    connection,
    { todoId: createdTodo.id },
  );
  typia.assert(fetched);

  // 4. Validate that detail fields match the created todo.
  TestValidator.equals(
    "fetched id matches created id",
    fetched.id,
    createdTodo.id,
  );
  TestValidator.equals("title matches", fetched.title, todoToCreate.title);
  TestValidator.equals(
    "description matches",
    fetched.description,
    todoToCreate.description,
  );
  TestValidator.equals(
    "due date matches",
    fetched.due_date,
    todoToCreate.due_date,
  );
  TestValidator.equals(
    "owner matches user",
    fetched.todo_list_user_id,
    authorized.id,
  );
  TestValidator.equals("completed still false", fetched.completed, false);
  TestValidator.equals(
    "created_at matches",
    fetched.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    fetched.updated_at,
    createdTodo.updated_at,
  );
}
