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
 * Test that a member can clear optional fields by explicitly setting null during update.
 *
 * Validates that optional fields (description, start_date, due_date) can be cleared to null
 * in an update request. The test creates a todo with all optional fields populated, then
 * performs an update setting them to null. Confirms the response reflects cleared values.
 *
 * 1. Authenticate a new member account.
 * 2. Create a todo with description, start_date, and due_date populated.
 * 3. Update the todo, explicitly setting optional fields to null.
 * 4. Validate the response shows null for cleared fields.
 */
export async function test_api_todo_update_clear_optional_fields_to_null(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a todo with description and dates set
  const startDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 86400000).toISOString();
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: startDate,
        due_date: dueDate,
      },
    },
  );
  typia.assert(initialTodo);
  // 3. Update the todo, explicitly clearing optional fields
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: "Updated Title",
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validate cleared fields are null
  TestValidator.equals("description cleared", updatedTodo.description, null);
  TestValidator.equals("start_date cleared", updatedTodo.start_date, null);
  TestValidator.equals("due_date cleared", updatedTodo.due_date, null);
  TestValidator.equals("title updated", updatedTodo.title, "Updated Title");
}
