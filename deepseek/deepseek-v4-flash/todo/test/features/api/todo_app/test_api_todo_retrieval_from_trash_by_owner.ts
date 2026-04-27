import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_retrieval_from_trash_by_owner(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the authenticated member can retrieve a soft-deleted (trashed) todo they own.
   *
   * Validates that the GET endpoint for retrieving a single todo returns the correct response even when the todo has been moved to the trash (soft-deleted). Ensures the deleted_at field is populated, all other fields retain their values, and the member association is correctly preserved.
   *
   * 1. Join as a member via POST /todoApp/auth/member/join to obtain JWT tokens.
   * 2. Create a new todo with a known title via POST /todoApp/member/todos.
   * 3. Soft-delete the todo via DELETE /todoApp/member/todos/{todoId} to move it to the trash.
   * 4. Retrieve the trashed todo via GET /todoApp/member/todos/{todoId}.
   * 5. Validate the response: deleted_at is non-null, title matches, member info is correctly included.
   */
  // 1. Join as a member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a new todo with a known title
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: { title },
    },
  );
  typia.assert(todo);
  // 3. Soft-delete the todo to move it to trash
  await api.functional.todoApp.member.todos.eraseByTodoid(memberConnection, {
    todoId: todo.id,
  });
  // 4. Retrieve the trashed todo
  const trashedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(trashedTodo);
  // 5. Validate that the retrieved todo is the trashed one
  TestValidator.equals("todo id matches", trashedTodo.id, todo.id);
  TestValidator.equals("todo title matches", trashedTodo.title, title);
  TestValidator.predicate(
    "deleted_at is non-null",
    trashedTodo.deleted_at !== null,
  );
  TestValidator.equals(
    "member id matches",
    trashedTodo.member.id,
    authorized.id,
  );
}
