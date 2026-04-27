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

/**
 * Test toggling a completed todo back to incomplete state.
 *
 * Validates the binary completion toggle behavior of the todo API. A completed todo (completed_at set) is toggled back to incomplete (completed_at null) by calling the complete endpoint a second time. Verifies that the response entity is valid and timestamps update correctly.
 *
 * 1. Registers a new member via the join endpoint, establishing an authenticated session.
 * 2. Creates a new todo item with a random title via the todos create endpoint.
 * 3. Calls the complete endpoint to mark the todo as complete, verifying completed_at is non-null.
 * 4. Calls the complete endpoint again to toggle back to incomplete, verifying completed_at is null and updated_at has advanced.
 */
export async function test_api_todo_complete_toggle_back_to_incomplete(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Create a new member account
  //----
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
  //----
  // 2. Create a new todo item
  //----
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  //----
  // 3. Mark todo as complete
  //----
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.complete(memberConnection, {
      todoId: todo.id,
    });
  typia.assert(completedTodo);
  TestValidator.predicate(
    "completed_at should be set after first toggle",
    completedTodo.completed_at !== null,
  );
  const firstUpdatedAt: string = completedTodo.updated_at;
  //----
  // 4. Toggle back to incomplete
  //----
  const incompletedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.complete(memberConnection, {
      todoId: todo.id,
    });
  typia.assert(incompletedTodo);
  TestValidator.predicate(
    "completed_at should be null after second toggle",
    incompletedTodo.completed_at === null,
  );
  TestValidator.predicate(
    "updated_at should be refreshed after second toggle",
    incompletedTodo.updated_at > firstUpdatedAt,
  );
}
