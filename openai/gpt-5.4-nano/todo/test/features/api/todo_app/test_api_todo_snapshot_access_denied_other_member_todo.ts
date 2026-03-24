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

export async function test_api_todo_snapshot_access_denied_other_member_todo(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAAuth);
  const memberATodo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: typia.random<string>(),
        start_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(memberATodo);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBAuth);
  const snapshotBody = {
    title: RandomGenerator.name(),
    description: typia.random<string>(),
    start_date: new Date().toISOString(),
    due_date: new Date().toISOString(),
    completion_status: typia.random<boolean>(),
  } satisfies ITodoAppTodoSnapshot.ICreate;
  await TestValidator.error(
    "snapshot creation should be denied for other member's todo",
    async () => {
      await generate_random_todo_app_member_todos_snapshots_create_snapshot(
        memberBConnection,
        {
          params: {
            todoId: memberATodo.id,
          },
          body: snapshotBody,
        },
      );
    },
  );
}
