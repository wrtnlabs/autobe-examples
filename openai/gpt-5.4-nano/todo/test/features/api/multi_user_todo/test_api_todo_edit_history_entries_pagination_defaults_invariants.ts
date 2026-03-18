import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import type { IPageIMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_edit_history_entries_pagination_defaults_invariants(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo);
  // Create at least 2 distinct edits by using different edited_at values.
  const updated1 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        edited_at: new Date().toISOString(),
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(updated1);
  const updated2 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        edited_at: new Date(Date.now() + 1000).toISOString(),
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(updated2);
  const defaultPageResponse =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(defaultPageResponse);
  const pagination = defaultPageResponse.pagination.pagination;
  TestValidator.predicate(
    "current page should be >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("limit should be > 0", pagination.limit > 0);
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages should equal ceil(records/limit)",
    pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "page data length should be <= limit",
    defaultPageResponse.data.length <= pagination.limit,
  );
  TestValidator.predicate(
    "pagination.records should be >= returned data length",
    pagination.records >= defaultPageResponse.data.length,
  );
  for (const entry of defaultPageResponse.data) {
    typia.assert(entry);
    TestValidator.predicate(
      "editedAt should be parseable as date-time",
      !Number.isNaN(Date.parse(entry.editedAt)),
    );
    if (entry.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt should be parseable as date-time",
        !Number.isNaN(Date.parse(entry.deletedAt)),
      );
    }
  }
  const explicitPageResponse =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: pagination.limit,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(explicitPageResponse);
  TestValidator.equals(
    "explicit request should keep current page as 1",
    explicitPageResponse.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "ordering/content should match first page",
    explicitPageResponse.data.map((x) => x.id),
    defaultPageResponse.data.map((x) => x.id),
  );
  TestValidator.equals(
    "ordering by editedAt should match",
    explicitPageResponse.data.map((x) => x.editedAt),
    defaultPageResponse.data.map((x) => x.editedAt),
  );
}
