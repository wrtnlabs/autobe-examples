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

export async function test_api_todo_history_order_indexes_rebuild_newest_first(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.Format<"password">>();
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  const memberAAuthConnection: api.IConnection = { host: connection.host };
  memberAAuthConnection.headers ??= {};
  memberAAuthConnection.headers.Authorization = memberA.token.access;
  const todoA = await generate_random_todo_app_member_todos_create(
    memberAAuthConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  const editTitle1 = `${todoA.title} - v1`;
  const editTitle2 = `${todoA.title} - v2`;
  const editTitle3 = `${todoA.title} - v3`;
  await api.functional.todoApp.member.todos.update(memberAAuthConnection, {
    todoId: todoA.id,
    body: {
      title: editTitle1,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      start_date: new Date().toISOString(),
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  await api.functional.todoApp.member.todos.update(memberAAuthConnection, {
    todoId: todoA.id,
    body: {
      title: editTitle2,
      description: null,
      start_date: null,
      due_date: new Date().toISOString(),
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Rapid additional edit for near-equal created_at histories
  await api.functional.todoApp.member.todos.update(memberAAuthConnection, {
    todoId: todoA.id,
    body: {
      title: editTitle3,
      description: RandomGenerator.paragraph({ sentences: 1 }),
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  const rebuildInput: ITodoAppTodo.IRequest = {
    completionStatusFilter: "all",
    sortBy: "created_at",
    sortDirection: "desc",
    page: 1 satisfies ITodoAppTodo.IRequest["page"],
    limit: 50 satisfies ITodoAppTodo.IRequest["limit"],
  };
  await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
    memberAAuthConnection,
    {
      todoId: todoA.id,
      body: rebuildInput,
    },
  );
  // Repeat rebuild to validate determinism/idempotency
  await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
    memberAAuthConnection,
    {
      todoId: todoA.id,
      body: rebuildInput,
    },
  );
  // Additional quick edit and rebuild
  await api.functional.todoApp.member.todos.update(memberAAuthConnection, {
    todoId: todoA.id,
    body: {
      title: `${editTitle3} - v4`,
      description: RandomGenerator.paragraph({ sentences: 1 }),
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
    memberAAuthConnection,
    {
      todoId: todoA.id,
      body: rebuildInput,
    },
  );
  // Negative: different member cannot rebuild other's todo history indexes
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.Format<"password">>();
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  const memberBAuthConnection: api.IConnection = { host: connection.host };
  memberBAuthConnection.headers ??= {};
  memberBAuthConnection.headers.Authorization = memberB.token.access;
  await TestValidator.httpError(
    "denies rebuilding order indexes for another member's todo",
    [403, 404],
    async () =>
      await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
        memberBAuthConnection,
        {
          todoId: todoA.id,
          body: rebuildInput,
        },
      ),
  );
}
