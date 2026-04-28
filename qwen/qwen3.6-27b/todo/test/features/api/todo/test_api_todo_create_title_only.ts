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
 * Creates a todo item with only the required title field, validating all system defaults.
 *
 * This test verifies that the system correctly handles minimal todo creation. The is_completed flag defaults to false, deleted_at remains null for active todos, and all optional fields (description, start_date, due_date) are null when omitted from the request. System-generated fields including the unique UUID identifier and creation/update timestamps are properly populated.
 *
 * 1. Register a new member account using the authorization utility function.
 * 2. Authenticated member creates a todo containing only the title field.
 * 3. Validate the response:
 *    3.1. Todo title matches the input value.
 *    3.2. is_completed defaults to false for newly created todos.
 *    3.3. deleted_at is null indicating the todo is active.
 *    3.4. Optional fields (description, start_date, due_date) are null when not provided.
 *    3.5. System-generated fields (id, created_at, updated_at) are populated.
 *    3.6. The todo is correctly associated with the authenticated member's account via the member summary object with id, email, and display_name.
 */
export async function test_api_todo_create_title_only(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const body = {
    title: todoTitle,
  } satisfies ITodoAppTodo.ICreate;
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo title matches", todo.title, todoTitle);
  TestValidator.equals("is_completed is false", todo.is_completed, false);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  TestValidator.predicate("created_at is set", todo.created_at !== null);
  TestValidator.predicate("updated_at is set", todo.updated_at !== null);
  TestValidator.equals("member id matches", todo.member.id, member.id);
  TestValidator.equals("member email matches", todo.member.email, member.email);
  TestValidator.predicate(
    "member display_name is not null",
    todo.member.display_name !== null,
  );
}
