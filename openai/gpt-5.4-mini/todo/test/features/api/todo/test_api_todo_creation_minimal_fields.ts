import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_creation_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test minimal todo creation with only the required title.
   *
   * Verifies that a private member can create a todo without providing any
   * optional scheduling or description fields. The test confirms the created
   * todo is persisted successfully, starts incomplete by default, and keeps
   * the optional fields unset in the response.
   *
   * 1. Register a new private member account.
   * 2. Create an authenticated actor-specific connection.
   * 3. Create a todo with only the required title field.
   * 4. Validate the response and verify default completion and optional fields.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMember.IJoin,
  });
  const title = RandomGenerator.name();
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo title", todo.title, title);
  TestValidator.predicate("todo is incomplete by default", !todo.isCompleted);
  TestValidator.predicate(
    "todo description is unset",
    todo.description === null || todo.description === undefined,
  );
  TestValidator.predicate(
    "todo start date is unset",
    todo.startDate === null || todo.startDate === undefined,
  );
  TestValidator.predicate(
    "todo due date is unset",
    todo.dueDate === null || todo.dueDate === undefined,
  );
}
