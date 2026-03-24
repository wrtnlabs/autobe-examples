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

export async function test_api_todo_snapshot_retrieval_denies_other_member_todo_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // Member A creates a todo and snapshot
  const memberATodo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(memberATodo);
  const memberASnapshot =
    await generate_random_todo_app_member_todos_snapshots_create_snapshot(
      memberAConnection,
      {
        params: { todoId: memberATodo.id },
        body: {
          title: memberATodo.title,
          description: memberATodo.description,
          start_date: memberATodo.start_date,
          due_date: memberATodo.due_date,
          completion_status: memberATodo.completion_status,
        } satisfies ITodoAppTodoSnapshot.ICreate,
      },
    );
  typia.assert(memberASnapshot);
  // Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // Member B attempts to retrieve member A's snapshot
  await TestValidator.httpError(
    "member B should not retrieve member A's private todo snapshot",
    [401, 403, 404],
    async () =>
      api.functional.todoApp.member.todos.snapshots.at(memberBConnection, {
        todoId: memberATodo.id,
        snapshotId: memberASnapshot.id,
      }),
  );
  // Ensure no observable side effects: verify member A snapshot still retrievable
  const memberASnapshotAgain =
    await api.functional.todoApp.member.todos.snapshots.at(memberAConnection, {
      todoId: memberATodo.id,
      snapshotId: memberASnapshot.id,
    });
  typia.assert(memberASnapshotAgain);
  TestValidator.equals(
    "snapshot id unchanged",
    memberASnapshotAgain.id,
    memberASnapshot.id,
  );
}
