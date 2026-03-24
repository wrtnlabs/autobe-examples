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

export async function test_api_todo_history_order_indexes_rebuild_excludes_deleted_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  } satisfies Parameters<typeof authorize_member_join>[1];
  const memberAuthorized = await authorize_member_join(
    memberConnection,
    memberCredentials,
  );
  const todo1: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  // 2) Perform at least two updates to create multiple history entries
  const titleA = `${RandomGenerator.name()}-${RandomGenerator.alphabets(5)}`;
  const titleB = `${RandomGenerator.name()}-${RandomGenerator.alphabets(5)}`;
  const titleC = `${RandomGenerator.name()}-${RandomGenerator.alphabets(5)}`;
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: todo1.id,
    body: { title: titleA } satisfies ITodoAppTodo.IUpdate,
  });
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: todo1.id,
    body: { title: titleB } satisfies ITodoAppTodo.IUpdate,
  });
  // Retrieve history timeline
  const historyBefore: IPageITodoAppTodoHistoryEntry.ISummary =
    await api.functional.todoApp.member.todos.history.index(memberConnection, {
      todoId: todo1.id,
      body: { page: 1, limit: 50 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    });
  typia.assert(historyBefore);
  TestValidator.predicate(
    "should have at least 2 history entries",
    historyBefore.data.length >= 2,
  );
  // Ensure newest-to-oldest by created_at
  const createdAtBefore = historyBefore.data.map((h) => h.created_at);
  const isDescending = createdAtBefore.every((v, i) => {
    if (i === 0) return true;
    return new Date(createdAtBefore[i - 1]).getTime() >= new Date(v).getTime();
  });
  TestValidator.predicate("history should be newest-to-oldest", isDescending);
  // Delete one specific history entry (choose the oldest among first page for determinism)
  const entryToErase = historyBefore.data[historyBefore.data.length - 1];
  await api.functional.todoApp.member.todos.history.erase(memberConnection, {
    todoId: todo1.id,
    historyEntryId: entryToErase.id,
  });
  // Rebuild ordering indexes
  await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
    memberConnection,
    {
      todoId: todo1.id,
      body: { page: 1, limit: 50 } satisfies ITodoAppTodo.IRequest,
    },
  );
  // Retrieve history timeline again
  const historyAfterErase: IPageITodoAppTodoHistoryEntry.ISummary =
    await api.functional.todoApp.member.todos.history.index(memberConnection, {
      todoId: todo1.id,
      body: { page: 1, limit: 50 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    });
  typia.assert(historyAfterErase);
  // Validate erased entry is excluded
  TestValidator.predicate(
    "erased entry should not appear in history",
    !historyAfterErase.data.some((h) => h.id === entryToErase.id),
  );
  // Validate order newest-to-oldest
  const createdAtAfter = historyAfterErase.data.map((h) => h.created_at);
  const isDescendingAfter = createdAtAfter.every((v, i) => {
    if (i === 0) return true;
    return new Date(createdAtAfter[i - 1]).getTime() >= new Date(v).getTime();
  });
  TestValidator.predicate(
    "history after rebuild should be newest-to-oldest",
    isDescendingAfter,
  );
  // Another edit then rebuild again
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: todo1.id,
    body: { title: titleC } satisfies ITodoAppTodo.IUpdate,
  });
  await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
    memberConnection,
    {
      todoId: todo1.id,
      body: { page: 1, limit: 50 } satisfies ITodoAppTodo.IRequest,
    },
  );
  const historyAfterSecondRebuild: IPageITodoAppTodoHistoryEntry.ISummary =
    await api.functional.todoApp.member.todos.history.index(memberConnection, {
      todoId: todo1.id,
      body: { page: 1, limit: 50 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    });
  typia.assert(historyAfterSecondRebuild);
  TestValidator.predicate(
    "erased entry should still be excluded after second rebuild",
    !historyAfterSecondRebuild.data.some((h) => h.id === entryToErase.id),
  );
  const createdAtSecond = historyAfterSecondRebuild.data.map(
    (h) => h.created_at,
  );
  const isDescendingSecond = createdAtSecond.every((v, i) => {
    if (i === 0) return true;
    return new Date(createdAtSecond[i - 1]).getTime() >= new Date(v).getTime();
  });
  TestValidator.predicate(
    "history after second rebuild should be newest-to-oldest",
    isDescendingSecond,
  );
  // Ownership denial: another member cannot rebuild indexes for this todoId
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Capture current order positions by capturing history ids sequence
  const beforeIds = historyAfterErase.data.map((h) => h.id);
  await TestValidator.error(
    "other member should not be able to rebuild orderIndexes for another member's todo",
    async () => {
      await api.functional.todoApp.member.todos.history.orderIndexes.updateHistoryOrderIndexes(
        otherConnection,
        {
          todoId: todo1.id,
          body: { page: 1, limit: 50 } satisfies ITodoAppTodo.IRequest,
        },
      );
    },
  );
  // Ensure original owner history order unchanged
  const afterDeniedRebuild: IPageITodoAppTodoHistoryEntry.ISummary =
    await api.functional.todoApp.member.todos.history.index(memberConnection, {
      todoId: todo1.id,
      body: { page: 1, limit: 50 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    });
  typia.assert(afterDeniedRebuild);
  TestValidator.equals(
    "history order should remain unchanged after denied rebuild",
    afterDeniedRebuild.data.map((h) => h.id),
    beforeIds,
  );
}
