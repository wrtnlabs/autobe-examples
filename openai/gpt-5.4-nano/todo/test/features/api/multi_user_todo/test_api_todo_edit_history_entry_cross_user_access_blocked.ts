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

export async function test_api_todo_edit_history_entry_cross_user_access_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2) Member B join
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 3) Member A creates a todo
  const createdHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {},
    );
  typia.assert(createdHistoryEntry);
  const todoId = createdHistoryEntry.id;
  // 4) Member A updates todo to generate at least one edit-history entry
  const editedAt1 = new Date().toISOString();
  await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
    todoId: todoId as unknown as string & tags.Format<"uuid">,
    body: {
      edited_at: editedAt1,
      changes: null,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  // 5) Member A lists edit history entries for that todo
  const historyPage =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.index(
      memberAConnection,
      {
        todoId: todoId as unknown as string & tags.Format<"uuid">,
        body: {},
      },
    );
  typia.assert(historyPage);
  TestValidator.predicate(
    "history has at least one entry",
    () => historyPage.data.length > 0,
  );
  const entryId = historyPage.data[0].id;
  // 6) Member B attempts cross-user access (must be blocked)
  await TestValidator.error(
    "member B is blocked from viewing member A edit history entry",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistory.at(
        memberBConnection,
        {
          todoId: todoId as unknown as string & tags.Format<"uuid">,
          entryId,
        },
      );
    },
  );
}
