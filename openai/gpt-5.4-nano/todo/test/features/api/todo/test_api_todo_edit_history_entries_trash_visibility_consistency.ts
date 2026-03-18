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

export async function test_api_todo_edit_history_entries_trash_visibility_consistency(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member1Auth);
  const todo = await generate_random_multi_user_todo_member_todos_create(
    member1Connection,
    {},
  );
  typia.assert(todo);
  // Perform one update to create at least one edit-history entry.
  await api.functional.multiUserTodo.member.todos.update(member1Connection, {
    todoId: todo.id,
    body: {
      edited_at: new Date().toISOString(),
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  // Move the todo to trash.
  await api.functional.multiUserTodo.member.todos.erase(member1Connection, {
    todoId: todo.id,
  });
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const historyPage =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      member1Connection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(historyPage);
  // Ensure all returned entries belong to this todo.
  for (const entry of historyPage.data) {
    TestValidator.equals(
      "history entry todo scope",
      entry.multiUserTodoId,
      todo.id,
    );
  }
  // Validate newest-first ordering by editedAt.
  for (let i = 1; i < historyPage.data.length; ++i) {
    TestValidator.predicate(
      `editedAt newest-first at index ${i}`,
      historyPage.data[i - 1].editedAt >= historyPage.data[i].editedAt,
    );
  }
  // Cross-user anti-leakage check.
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member2Auth);
  await TestValidator.error(
    "cross-user edit history must be denied without leaking data",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
        member2Connection,
        {
          todoId: todo.id,
          body: {
            page: 1,
            limit,
          } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
        },
      );
    },
  );
}
