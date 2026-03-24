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

export async function test_api_todo_snapshot_create_in_trash_sets_lifecycle_deleted(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  memberConnection.headers = undefined;
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authConnection, {
    body: {
      email: member.email,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    authConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  await api.functional.todoApp.member.todos.erase(authConnection, {
    todoId: todo.id,
  });
  const snapshotTitle: string = RandomGenerator.name();
  const completionStatus = false;
  const snapshot =
    await generate_random_todo_app_member_todos_snapshots_create_snapshot(
      authConnection,
      {
        params: {
          todoId: todo.id,
        },
        body: {
          title: snapshotTitle,
          description: null,
          start_date: null,
          due_date: null,
          completion_status: completionStatus,
        } satisfies ITodoAppTodoSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot.todoAppTodoId matches todo.id",
    snapshot.todoAppTodoId,
    todo.id,
  );
  TestValidator.equals(
    "snapshot.title matches payload",
    snapshot.title,
    snapshotTitle,
  );
  TestValidator.equals(
    "snapshot.description matches payload",
    snapshot.description,
    null,
  );
  TestValidator.equals(
    "snapshot.startDate matches payload",
    snapshot.startDate,
    null,
  );
  TestValidator.equals(
    "snapshot.dueDate matches payload",
    snapshot.dueDate,
    null,
  );
  TestValidator.equals(
    "snapshot.completionStatus matches payload",
    snapshot.completionStatus,
    completionStatus,
  );
  TestValidator.equals(
    "snapshot.lifecycleDeleted is true after todo moved to trash",
    snapshot.lifecycleDeleted,
    true,
  );
}
