import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistoryEntry";
import type { IPageIMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_edit_history_entries_ordered_and_preserves_completion_toggle_changes(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<string & tags.MinLength<1> & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);

  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    typia.assert<
      {
        body?: {
          title?: string | undefined;
          description?: string | null | undefined;
          startDate?: (string & tags.Format<"date-time">) | null | undefined;
          dueDate?: (string & tags.Format<"date-time">) | null | undefined;
        } | undefined;
      } & Record<string, unknown>
    >(prepare_random_multi_user_todo_todo()),
  );
  typia.assert(todo);

  const todoId = todo.id;

  const pageSize = 100;
  const page1 =
    await api.functional.multiUserTodo.member.todos.edit_history_entries.editHistoryEntries(
      memberConnection,
      {
        todoId,
        body: {
          todoIds: [todoId],
          page: null,
          limit: pageSize,
        },
      },
    );
  typia.assert(page1);

  const entries1 = page1.data;
  TestValidator.predicate("history entries are returned", entries1.length > 0);

  for (const entry of entries1) {
    TestValidator.equals("todo id in history matches", entry.id, todoId);
  }

  const hasComplete = ArrayUtil.has(entries1, (e) => e.isComplete === true);
  const hasIncomplete = ArrayUtil.has(entries1, (e) => e.isComplete === false);

  if (entries1.length >= 2) {
    TestValidator.predicate(
      "history reflects completion state transitions when multiple entries exist",
      hasComplete && hasIncomplete,
    );
  }

  for (let i = 0; i + 1 < entries1.length; i++) {
    TestValidator.predicate(
      `page1 updatedAt is non-increasing at index ${i}`,
      new Date(entries1[i].updatedAt).getTime() >= new Date(entries1[i + 1].updatedAt).getTime(),
    );
  }

  const page2 =
    await api.functional.multiUserTodo.member.todos.edit_history_entries.editHistoryEntries(
      memberConnection,
      {
        todoId,
        body: {
          todoIds: [todoId],
          page: 1,
          limit: pageSize,
        },
      },
    );
  typia.assert(page2);

  for (const entry of page2.data) {
    TestValidator.equals("todo id in history matches on page 2", entry.id, todoId);
  }

  const combined = [...entries1, ...page2.data];
  for (let i = 0; i + 1 < combined.length; i++) {
    TestValidator.predicate(
      `combined updatedAt is non-increasing at index ${i}`,
      new Date(combined[i].updatedAt).getTime() >= new Date(combined[i + 1].updatedAt).getTime(),
    );
  }
}
