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

export async function test_api_todo_history_order_indexes_position_matches_newest_to_oldest(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Authenticate member (join)
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Create a todo
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: null,
    start_date: null,
    due_date: null,
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    { body: todoCreateBody },
  );
  typia.assert(createdTodo);
  // 3) Apply multiple edits to generate multiple history entries.
  const edit1Title = RandomGenerator.paragraph({ sentences: 1 });
  const edit1Desc = RandomGenerator.paragraph({ sentences: 2 });
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: createdTodo.id,
    body: {
      title: edit1Title,
      description: edit1Desc,
      start_date: null,
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  const edit2Start = RandomGenerator.date(new Date(), 1000 * 60 * 60);
  const edit2Due = RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24);
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: createdTodo.id,
    body: {
      title: edit1Title,
      description: edit1Desc,
      start_date: edit2Start.toISOString(),
      due_date: edit2Due.toISOString(),
    } satisfies ITodoAppTodo.IUpdate,
  });
  const edit3Title = RandomGenerator.paragraph({ sentences: 1 });
  await api.functional.todoApp.member.todos.update(memberConnection, {
    todoId: createdTodo.id,
    body: {
      title: edit3Title,
      description: edit1Desc,
      start_date: edit2Start.toISOString(),
      due_date: edit2Due.toISOString(),
    } satisfies ITodoAppTodo.IUpdate,
  });
  // 4) Retrieve history to obtain distinct historyEntryIds and timestamps.
  const historyPage = await api.functional.todoApp.member.todos.history.index(
    memberConnection,
    {
      todoId: createdTodo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(historyPage);
  TestValidator.predicate(
    "history should have at least 2 entries",
    historyPage.data.length >= 2,
  );
  const [entryNewer, entryOlder] = historyPage.data;
  // Call orderIndexes for both entries
  const newerOrderIndex =
    await api.functional.todoApp.member.todos.history.orderIndexes.invertOrderIndexes(
      memberConnection,
      {
        todoId: createdTodo.id,
        historyEntryId: entryNewer.id,
      },
    );
  typia.assert(newerOrderIndex);
  const olderOrderIndex =
    await api.functional.todoApp.member.todos.history.orderIndexes.invertOrderIndexes(
      memberConnection,
      {
        todoId: createdTodo.id,
        historyEntryId: entryOlder.id,
      },
    );
  typia.assert(olderOrderIndex);
  // Validate that returned order index rows are tied to their respective history entries.
  TestValidator.equals(
    "newer order index history entry id matches",
    newerOrderIndex.todo_app_todo_history_entry_id,
    entryNewer.id,
  );
  TestValidator.equals(
    "older order index history entry id matches",
    olderOrderIndex.todo_app_todo_history_entry_id,
    entryOlder.id,
  );
  TestValidator.equals(
    "both order index rows are for the same todo",
    newerOrderIndex.todo_app_todo_id,
    olderOrderIndex.todo_app_todo_id,
  );
  // Validate semantic ordering: newest should appear earlier => position ascending means newer has smaller position.
  const newerTime = Date.parse(entryNewer.created_at);
  const olderTime = Date.parse(entryOlder.created_at);
  TestValidator.predicate(
    "newer created_at should be >= older created_at",
    newerTime >= olderTime,
  );
  TestValidator.predicate(
    "newer position should be smaller or equal than older position (newest-to-oldest ordering)",
    newerOrderIndex.position <= olderOrderIndex.position,
  );
  // Idempotency: call again and ensure position doesn't change
  const newerOrderIndex2 =
    await api.functional.todoApp.member.todos.history.orderIndexes.invertOrderIndexes(
      memberConnection,
      {
        todoId: createdTodo.id,
        historyEntryId: entryNewer.id,
      },
    );
  typia.assert(newerOrderIndex2);
  const olderOrderIndex2 =
    await api.functional.todoApp.member.todos.history.orderIndexes.invertOrderIndexes(
      memberConnection,
      {
        todoId: createdTodo.id,
        historyEntryId: entryOlder.id,
      },
    );
  typia.assert(olderOrderIndex2);
  TestValidator.equals(
    "newer position stable",
    newerOrderIndex2.position,
    newerOrderIndex.position,
  );
  TestValidator.equals(
    "older position stable",
    olderOrderIndex2.position,
    olderOrderIndex.position,
  );
  TestValidator.equals(
    "newer mapping stable",
    newerOrderIndex2.todo_app_todo_history_entry_id,
    newerOrderIndex.todo_app_todo_history_entry_id,
  );
  TestValidator.equals(
    "older mapping stable",
    olderOrderIndex2.todo_app_todo_history_entry_id,
    olderOrderIndex.todo_app_todo_history_entry_id,
  );
  void authorized;
}
