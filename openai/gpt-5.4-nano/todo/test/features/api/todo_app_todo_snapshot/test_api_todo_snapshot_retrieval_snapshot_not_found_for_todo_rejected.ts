import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { generate_random_todo_app_member_todos_snapshots_create_snapshot } from "../../../generate/generate_random_todo_app_member_todos_snapshots_create_snapshot";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { prepare_random_todo_app_todo_snapshot } from "../../../prepare/prepare_random_todo_app_todo_snapshot";

export async function test_api_todo_snapshot_retrieval_snapshot_not_found_for_todo_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // Ensure we use the issued access token for subsequent member requests.
  memberConnection.headers = { ...(memberConnection.headers ?? {}) };
  memberConnection.headers.Authorization = authorized.token.access;
  const todoA = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  const todoB = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB);
  const snapshotA =
    await generate_random_todo_app_member_todos_snapshots_create_snapshot(
      memberConnection,
      {
        params: {
          todoId: todoA.id,
        },
        body: {
          title: RandomGenerator.name(),
          description: null,
          start_date: null,
          due_date: null,
          completion_status: false,
        } satisfies ITodoAppTodoSnapshot.ICreate,
      },
    );
  typia.assert(snapshotA);
  await TestValidator.error(
    "snapshot not found for given todoId",
    async () =>
      await api.functional.todoApp.member.todos.snapshots.at(memberConnection, {
        todoId: todoB.id,
        snapshotId: snapshotA.id,
      }),
  );
}
