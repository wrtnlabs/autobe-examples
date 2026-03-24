import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryEntry";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import type { ITodoAppTodoHistoryEntryOrderIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntryOrderIndex";
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

export async function test_api_todo_history_order_indexes_returns_owned_index_and_enforces_privacy(
  connection: api.IConnection,
): Promise<void> {
  // Scenario A — Returns owned ordering index row for a member-owned todo history entry.
  // Scenario B — Best-effort non-leakage when requesting orderIndexes for another history entry.
  // Scenario C — Blocks access when todo/historyEntryId does not belong to the requester.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
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
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  await api.functional.todoApp.member.todos.update(memberAConnection, {
    todoId: todo.id,
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      description: null,
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  const historyPage = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(historyPage);
  TestValidator.predicate(
    "history has at least 1 entry",
    () => historyPage.data.length >= 1,
  );
  const historyEntryId = historyPage.data[0].id;
  // Scenario A
  const ownedIndex =
    await api.functional.todoApp.member.todos.history.orderIndexes.invertOrderIndexes(
      memberAConnection,
      {
        todoId: todo.id,
        historyEntryId,
      },
    );
  typia.assert(ownedIndex);
  TestValidator.equals(
    "index belongs to todo",
    ownedIndex.todo_app_todo_id,
    todo.id,
  );
  TestValidator.equals(
    "index belongs to history entry",
    ownedIndex.todo_app_todo_history_entry_id,
    historyEntryId,
  );
  // Scenario B (best-effort): requesting another owned history entry must not leak cross-ownership.
  const otherHistoryEntryId =
    historyPage.data.length > 1 ? historyPage.data[1].id : historyEntryId;
  const otherOwnedIndex =
    await api.functional.todoApp.member.todos.history.orderIndexes.invertOrderIndexes(
      memberAConnection,
      {
        todoId: todo.id,
        historyEntryId: otherHistoryEntryId,
      },
    );
  typia.assert(otherOwnedIndex);
  TestValidator.equals(
    "other index belongs to todo",
    otherOwnedIndex.todo_app_todo_id,
    todo.id,
  );
  // Scenario C
  await TestValidator.error(
    "member B cannot access member A history orderIndexes",
    async () => {
      await api.functional.todoApp.member.todos.history.orderIndexes.invertOrderIndexes(
        memberBConnection,
        {
          todoId: todo.id,
          historyEntryId,
        },
      );
    },
  );
}
