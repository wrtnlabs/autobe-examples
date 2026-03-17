import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

/**
 * Test creating a new todo with only the required title field, omitting all optional fields.
 *
 * Test flow:
 * 1. Authenticate as a new member via authorize_member_join utility
 * 2. Create a todo with only the title field provided
 * 3. Verify the response contains the submitted title
 * 4. Verify optional fields are null: description, start_date, due_date
 * 5. Verify system defaults: completed is false, deleted_at is null
 * 6. Verify timestamps are set (created_at, updated_at)
 * 7. Verify the member association is correctly established
 */
export async function test_api_todo_creation_minimal_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {});
  typia.assert(authResponse);
  // 2. Create a todo with only the required title field
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const todo = await api.functional.privateTodoApp.member.todos.create(
    memberConnection,
    {
      body: { title } satisfies IPrivateTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Verify the submitted title matches
  TestValidator.equals("title should match submitted value", todo.title, title);
  // 4. Verify optional fields are null
  TestValidator.equals("description should be null", todo.description, null);
  TestValidator.equals("start_date should be null", todo.start_date, null);
  TestValidator.equals("due_date should be null", todo.due_date, null);
  // 5. Verify system defaults
  TestValidator.equals(
    "completed should default to false",
    todo.completed,
    false,
  );
  TestValidator.equals(
    "deleted_at should be null for active todo",
    todo.deleted_at,
    null,
  );
  // 6. Verify timestamps are set
  TestValidator.predicate(
    "created_at should be set",
    todo.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be set",
    todo.updated_at.length > 0,
  );
  // 7. Verify member association
  TestValidator.equals(
    "member id should match authenticated member",
    todo.member.id,
    authResponse.id,
  );
}
