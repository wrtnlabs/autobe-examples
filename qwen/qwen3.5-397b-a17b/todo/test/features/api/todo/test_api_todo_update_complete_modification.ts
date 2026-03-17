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

export async function test_api_todo_update_complete_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create initial todo with all fields set
  const initialTodo: ITodoAppTodo =
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days from now
      },
    });
  typia.assert(initialTodo);
  // 3. Update the todo with new values for all editable fields
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedStartedAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString(); // 1 day from now
  const updatedDueAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 14,
  ).toISOString(); // 14 days from now
  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.update(memberConnection, {
      todoId: initialTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        started_at: updatedStartedAt,
        due_at: updatedDueAt,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);
  // 4. Verify updated fields match the new values
  TestValidator.equals("title updated", updatedTodo.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "started_at updated",
    updatedTodo.started_at,
    updatedStartedAt,
  );
  TestValidator.equals("due_at updated", updatedTodo.due_at, updatedDueAt);
  // 5. Verify system-managed fields remain unchanged
  TestValidator.equals("id unchanged", updatedTodo.id, initialTodo.id);
  TestValidator.equals(
    "member unchanged",
    updatedTodo.member.id,
    initialTodo.member.id,
  );
  TestValidator.equals(
    "member display_name unchanged",
    updatedTodo.member.display_name,
    initialTodo.member.display_name,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedTodo.created_at,
    initialTodo.created_at,
  );
  TestValidator.equals(
    "completion status unchanged",
    updatedTodo.completed,
    initialTodo.completed,
  );
  // 6. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedTodo.updated_at,
    initialTodo.updated_at,
  );
  // 7. Verify updated_at is later than original
  TestValidator.predicate(
    "updated_at is after original",
    new Date(updatedTodo.updated_at) > new Date(initialTodo.updated_at),
  );
}
