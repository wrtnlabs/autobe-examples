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
 * Test that a member can create a todo with only a title and the system correctly applies all defaults.
 *
 * Validates the default behavior when creating a todo with minimal input. When only the title is provided, the server should automatically set completed_at to null (indicating the todo is incomplete by default), and leave all optional fields — description, start_date, and due_date — as null. The title should match the submitted value exactly.
 *
 * 1. Register a new member via the join endpoint to obtain authentication credentials.
 * 2. Create a todo providing only the title field with no optional fields.
 * 3. Validate that the response contains the correct title, completed_at is null (incomplete by default), and all optional fields are null.
 */
export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a todo with only a title
  const title = "Buy groceries";
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate server-applied defaults
  TestValidator.equals("title matches submitted value", todo.title, title);
  TestValidator.equals(
    "completed_at defaults to null (incomplete)",
    todo.completed_at,
    null,
  );
  TestValidator.equals("description defaults to null", todo.description, null);
  TestValidator.equals("start_date defaults to null", todo.start_date, null);
  TestValidator.equals("due_date defaults to null", todo.due_date, null);
}
