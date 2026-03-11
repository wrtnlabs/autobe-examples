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
 * Test updating a todo by clearing optional fields using null values.
 * 1. Member registers and authenticates
 * 2. Create a todo with description, start_date, and due_date populated
 * 3. Update the todo by setting all three optional fields to null
 * 4. Verify the response shows null values for description, start_date, and due_date
 * 5. Verify title remains intact after update
 */
export async function test_api_todo_update_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Create a todo with all optional fields populated
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Verify initial state has populated optional fields
  TestValidator.predicate(
    "description is populated",
    todo.description !== null,
  );
  TestValidator.predicate("start_date is populated", todo.start_date !== null);
  TestValidator.predicate("due_date is populated", todo.due_date !== null);
  // 3. Update the todo by clearing all optional fields with null
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify optional fields are now null
  TestValidator.equals("description cleared", updatedTodo.description, null);
  TestValidator.equals("start_date cleared", updatedTodo.start_date, null);
  TestValidator.equals("due_date cleared", updatedTodo.due_date, null);
  // 5. Verify title remains intact
  TestValidator.equals("title unchanged", updatedTodo.title, todo.title);
}
