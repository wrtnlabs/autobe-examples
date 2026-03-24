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

export async function test_api_todo_snapshot_retrieval_own_snapshot_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join (creates authenticated session)
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
  // 2) Create a todo owned by the member
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 2 });
  const startDate = RandomGenerator.date(new Date(), 1000 * 60 * 60) // within next hour
    .toISOString() satisfies string;
  const dueDate = RandomGenerator.date(
    new Date(Date.now() + 1000 * 60 * 60),
    1000 * 60 * 60 * 24,
  ).toISOString() satisfies string;
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
        start_date: startDate satisfies ITodoAppTodo.ICreate["start_date"],
        due_date: dueDate satisfies ITodoAppTodo.ICreate["due_date"],
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3) Create a point-in-time snapshot for that todo
  const snapshot =
    await generate_random_todo_app_member_todos_snapshots_create_snapshot(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: {
          title: todo.title,
          description: todo.description,
          start_date: todo.start_date,
          due_date: todo.due_date,
          completion_status: todo.completion_status,
        } satisfies ITodoAppTodoSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4) Retrieve the snapshot via member read-only endpoint
  const fetched = await api.functional.todoApp.member.todos.snapshots.at(
    memberConnection,
    {
      todoId: todo.id,
      snapshotId: snapshot.id,
    },
  );
  typia.assert(fetched);
  // Validate fields correspond to persisted snapshot-time state
  TestValidator.equals("snapshot id matches", fetched.id, snapshot.id);
  TestValidator.equals(
    "snapshot todo id matches",
    fetched.todoAppTodoId,
    snapshot.todoAppTodoId,
  );
  TestValidator.equals("snapshot title matches", fetched.title, snapshot.title);
  TestValidator.equals(
    "snapshot description matches",
    fetched.description,
    snapshot.description,
  );
  TestValidator.equals(
    "snapshot startDate matches",
    fetched.startDate,
    snapshot.startDate,
  );
  TestValidator.equals(
    "snapshot dueDate matches",
    fetched.dueDate,
    snapshot.dueDate,
  );
  TestValidator.equals(
    "snapshot completionStatus matches",
    fetched.completionStatus,
    snapshot.completionStatus,
  );
  TestValidator.equals(
    "snapshot lifecycleDeleted matches",
    fetched.lifecycleDeleted,
    snapshot.lifecycleDeleted,
  );
  TestValidator.equals(
    "snapshot deletedAt matches",
    fetched.deletedAt,
    snapshot.deletedAt,
  );
  // Read-only assurance: another read should match captured snapshot (no mutation by GET)
  const fetched2 = await api.functional.todoApp.member.todos.snapshots.at(
    memberConnection,
    {
      todoId: todo.id,
      snapshotId: snapshot.id,
    },
  );
  typia.assert(fetched2);
  TestValidator.equals("snapshot id stable", fetched2.id, snapshot.id);
  TestValidator.equals(
    "read-only fields stable",
    fetched2,
    snapshot,
    (key) => key === "createdAt" || key === "updatedAt" || key === "deletedAt",
  );
}
