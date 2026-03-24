import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

export async function test_api_todo_erase_idempotent_when_already_in_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1) Setup: Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // use the same connection (authorize utility already configured headers)
  typia.assert(join);
  // 2) Create todo
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  const todoId: string & tags.Format<"uuid"> = created.id;
  // 3) First erase -> move to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId,
  });
  // 4) Pre-check: ensure appears in trash list and not in normal list.
  // We use completionStatusFilter=all and rely on deleted_in_trash_at field.
  const listAfterFirstErase = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "desc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(listAfterFirstErase);
  const idsInReturnedList = listAfterFirstErase.data.map((t) => t.id);
  TestValidator.predicate(
    "todo should be visible in the returned list after first erase",
    idsInReturnedList.includes(todoId),
  );
  TestValidator.predicate(
    "todo should be marked as in trash in returned list",
    listAfterFirstErase.data.some(
      (t) => t.id === todoId && t.deleted_in_trash_at !== null,
    ),
  );
  TestValidator.predicate(
    "todo should not appear as active (not in trash) after first erase",
    !listAfterFirstErase.data.some(
      (t) => t.id === todoId && t.deleted_in_trash_at === null,
    ),
  );
  // 5) Act: second erase (idempotent)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId,
  });
  // 6) Validate idempotent behavior
  const listAfterSecondErase = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completionStatusFilter: "all",
        sortBy: "created_at",
        sortDirection: "desc",
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(listAfterSecondErase);
  TestValidator.predicate(
    "todo should still be present in trash after second erase",
    listAfterSecondErase.data.some(
      (t) => t.id === todoId && t.deleted_in_trash_at !== null,
    ),
  );
  TestValidator.predicate(
    "todo should not reappear in normal active list after second erase",
    !listAfterSecondErase.data.some(
      (t) => t.id === todoId && t.deleted_in_trash_at === null,
    ),
  );
  // history entries still retrievable
  const historyPage =
    await api.functional.todoApp.member.todos.history_entries.index(
      memberConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 100,
        } satisfies ITodoAppTodoHistoryEntry.IRequest,
      },
    );
  typia.assert(historyPage);
  TestValidator.predicate(
    "history page should have returned entries data (may be empty but response exists)",
    historyPage.data !== undefined,
  );
}
