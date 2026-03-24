import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryEntry";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
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

export async function test_api_todo_history_order_indexes_rebuild_deterministic_tie_breaker(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ITodoAppMember.IJoin;
  const member1Auth = await authorize_member_join(member1Connection, {
    body: member1Credentials,
  });
  typia.assert(member1Auth);
  const todo1a = await generate_random_todo_app_member_todos_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1a);
  // Create multiple history entries by successive updates.
  const edits = [
    RandomGenerator.name(),
    RandomGenerator.name(),
    RandomGenerator.name(),
  ];
  await api.functional.todoApp.member.todos.update(member1Connection, {
    todoId: todo1a.id,
    body: {
      title: edits[0],
      description: RandomGenerator.paragraph({ sentences: 2 }),
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  await api.functional.todoApp.member.todos.update(member1Connection, {
    todoId: todo1a.id,
    body: {
      title: edits[1],
      description: RandomGenerator.paragraph({ sentences: 3 }),
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  await api.functional.todoApp.member.todos.update(member1Connection, {
    todoId: todo1a.id,
    body: {
      title: edits[2],
      description: RandomGenerator.paragraph({ sentences: 4 }),
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  const rebuildAndRead = async (
    todoId: string & tags.Format<"uuid">,
  ): Promise<
    {
      id: string & tags.Format<"uuid">;
      created_at: string & tags.Format<"date-time">;
    }[]
  > => {
    await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
      member1Connection,
      {
        todoId,
        body: {
          completionStatusFilter: "all",
          sortBy: "created_at",
          sortDirection: "desc",
          page: 1,
          limit: 50,
        } satisfies ITodoAppTodo.IRequest,
      },
    );
    const history = await api.functional.todoApp.member.todos.history.index(
      member1Connection,
      {
        todoId,
        body: {
          page: 1,
          limit: 100,
        } satisfies ITodoAppTodoHistoryEntry.IRequest,
      },
    );
    typia.assert(history);
    const entries = history.data;
    // Verify newest-to-oldest monotonicity and id tie-breaker within created_at groups.
    for (let i = 0; i + 1 < entries.length; i++) {
      const a = entries[i];
      const b = entries[i + 1];
      TestValidator.predicate(
        `created_at should be non-increasing at index ${i}`,
        () => a.created_at >= b.created_at,
      );
    }
    for (let i = 0; i < entries.length; ) {
      const groupCreatedAt = entries[i].created_at;
      let j = i;
      const groupIds: (string & tags.Format<"uuid">)[] = [];
      while (j < entries.length && entries[j].created_at === groupCreatedAt) {
        groupIds.push(entries[j].id);
        j++;
      }
      const sorted = [...groupIds].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
      TestValidator.equals(
        `tie-breaker ids for created_at=${groupCreatedAt}`,
        groupIds,
        sorted,
      );
      i = j;
    }
    return entries.map((e) => ({ id: e.id, created_at: e.created_at }));
  };
  const rebuilt1 = await rebuildAndRead(todo1a.id);
  const rebuilt2 = await rebuildAndRead(todo1a.id);
  TestValidator.equals(
    "rebuild ordering should be deterministic",
    rebuilt1,
    rebuilt2,
  );
  // Ownership/denial check for member isolation.
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ITodoAppMember.IJoin;
  const member2Auth = await authorize_member_join(member2Connection, {
    body: member2Credentials,
  });
  typia.assert(member2Auth);
  const todo2 = await generate_random_todo_app_member_todos_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  await TestValidator.error(
    "member1 cannot rebuild member2 todo history ordering",
    async () => {
      await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
        member1Connection,
        {
          todoId: todo2.id,
          body: {
            completionStatusFilter: "all",
            sortBy: "created_at",
            sortDirection: "desc",
            page: 1,
            limit: 50,
          } satisfies ITodoAppTodo.IRequest,
        },
      );
    },
  );
}
