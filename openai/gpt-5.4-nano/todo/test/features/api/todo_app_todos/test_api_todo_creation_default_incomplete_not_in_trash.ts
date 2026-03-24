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

export async function test_api_todo_creation_default_incomplete_not_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a new member account.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2) Create a todo with a valid non-empty title.
  const title = RandomGenerator.alphabets(10);
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3) Validate default lifecycle state.
  TestValidator.equals(
    "completion_status is false by default",
    todo.completion_status,
    false,
  );
  TestValidator.equals(
    "deleted_in_trash_at is null by default",
    todo.deleted_in_trash_at,
    null,
  );
  TestValidator.equals("deleted_at is null by default", todo.deleted_at, null);
  // 4) Validate server-managed timestamps.
  TestValidator.predicate(
    "created_at is an ISO-8601 datetime",
    () => !Number.isNaN(Date.parse(todo.created_at)),
  );
  TestValidator.predicate(
    "updated_at is an ISO-8601 datetime",
    () => !Number.isNaN(Date.parse(todo.updated_at)),
  );
  // Business inference (non-trash/non-deleted implies normal lifecycle context).
  TestValidator.predicate(
    "todo is considered active (no trash/deleted timestamps)",
    () => todo.deleted_in_trash_at === null && todo.deleted_at === null,
  );
}
