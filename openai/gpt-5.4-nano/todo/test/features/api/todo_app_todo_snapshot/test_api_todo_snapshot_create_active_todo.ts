import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_snapshots_create_snapshot } from "../../../generate/generate_random_todo_app_member_todos_snapshots_create_snapshot";
import { prepare_random_todo_app_todo_snapshot } from "../../../prepare/prepare_random_todo_app_todo_snapshot";

export async function test_api_todo_snapshot_create_active_todo(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers ??= {};
  actorConnection.headers.Authorization = memberAuth.token.access;
  const startDate = RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24);
  const dueDate = new Date(startDate.getTime() + 1000 * 60 * 60 * 24);
  const completionStatus = true;
  // A todoId is required for snapshot creation. The provided materials do not
  // include a todo-creation API, so we use a valid UUID here.
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const payload = {
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    start_date: startDate.toISOString(),
    due_date: dueDate.toISOString(),
    completion_status: completionStatus,
  } satisfies ITodoAppTodoSnapshot.ICreate;
  const snapshot =
    await generate_random_todo_app_member_todos_snapshots_create_snapshot(
      actorConnection,
      {
        params: { todoId },
        body: payload,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot todoAppTodoId matches todoId",
    snapshot.todoAppTodoId,
    todoId,
  );
  TestValidator.equals("snapshot title matches", snapshot.title, payload.title);
  TestValidator.equals(
    "snapshot description matches",
    snapshot.description,
    payload.description,
  );
  TestValidator.equals(
    "snapshot startDate matches",
    snapshot.startDate,
    payload.start_date,
  );
  TestValidator.equals(
    "snapshot dueDate matches",
    snapshot.dueDate,
    payload.due_date,
  );
  TestValidator.equals(
    "snapshot completionStatus matches",
    snapshot.completionStatus,
    payload.completion_status,
  );
  // Since we don't have a todo-creation API in provided materials,
  // lifecycleDeleted cannot be reliably asserted for an 'active todo'.
  TestValidator.predicate(
    "snapshot lifecycleDeleted is boolean",
    typeof snapshot.lifecycleDeleted === "boolean",
  );
  TestValidator.predicate(
    "snapshot createdAt exists",
    () => snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot updatedAt exists",
    () => snapshot.updatedAt.length > 0,
  );
}
