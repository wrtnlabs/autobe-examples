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
 * Test updating a todo item with all modifiable fields.
 *
 * Workflow:
 * 1. Register a new member and establish authenticated session
 * 2. Create a todo item with initial values
 * 3. Update the todo with new title, description, start_date, and due_date
 * 4. Validate all updated fields match the input values
 * 5. Verify updated_at timestamp has changed
 * 6. Confirm todo remains active (deleted_at is null)
 * 7. Validate member relation is preserved
 */
export async function test_api_todo_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create initial todo
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // 3. Prepare update data with all fields
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    start_date: new Date(Date.now() + 86400000).toISOString(),
    due_date: new Date(Date.now() + 86400000 * 30).toISOString(),
  } satisfies ITodoAppTodo.IUpdate;
  // 4. Update the todo
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: updateData,
    },
  );
  typia.assert(updatedTodo);
  // 5. Validate all updated fields match input
  TestValidator.equals("title updated", updatedTodo.title, updateData.title);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updateData.description,
  );
  TestValidator.equals(
    "start_date updated",
    updatedTodo.start_date,
    updateData.start_date,
  );
  TestValidator.equals(
    "due_date updated",
    updatedTodo.due_date,
    updateData.due_date,
  );
  // 6. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at changed",
    initialTodo.updated_at,
    updatedTodo.updated_at,
  );
  // 7. Confirm todo remains active
  TestValidator.predicate("todo is active", updatedTodo.deleted_at === null);
  // 8. Validate member relation preserved
  TestValidator.equals(
    "member id preserved",
    updatedTodo.member.id,
    initialTodo.member.id,
  );
  TestValidator.equals(
    "member display_name preserved",
    updatedTodo.member.display_name,
    initialTodo.member.display_name,
  );
  // 9. Verify other fields unchanged
  TestValidator.equals("id unchanged", updatedTodo.id, initialTodo.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedTodo.created_at,
    initialTodo.created_at,
  );
  TestValidator.equals(
    "completed unchanged",
    updatedTodo.completed,
    initialTodo.completed,
  );
}
