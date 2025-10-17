import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_create_by_user(
  connection: api.IConnection,
) {
  // 1) Register a new user (join) to obtain authorization context for subsequent calls
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: userEmail,
    password: userPassword,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Create a new todo as the authenticated user
  const createRequest = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    position: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    // intentionally omit is_completed to verify server default behavior
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: createRequest,
    },
  );
  typia.assert(todo);

  // 3) Business assertions
  TestValidator.equals(
    "created todo title matches request",
    todo.title,
    createRequest.title,
  );
  TestValidator.equals(
    "created todo belongs to joined user",
    todo.user_id,
    authorized.id,
  );
  TestValidator.equals(
    "is_completed defaults to false when omitted",
    todo.is_completed,
    false,
  );
  TestValidator.equals(
    "position is echoed when provided",
    todo.position,
    createRequest.position,
  );

  // 4) Timestamp sanity: updated_at must be >= created_at
  const createdAt = Date.parse(todo.created_at);
  const updatedAt = Date.parse(todo.updated_at);
  TestValidator.predicate(
    "updated_at should be >= created_at",
    updatedAt >= createdAt,
  );
}
