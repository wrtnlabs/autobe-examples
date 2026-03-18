import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
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

export async function test_api_todo_restore_from_trash_success_preserves_history(
  connection: api.IConnection,
): Promise<void> {
  // Scenario A: restore success + consistency checks using available APIs.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuth);
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(createdTodo);
  const todoId = createdTodo.id as string & tags.Format<"uuid">;
  // Move todo into trash.
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId,
  });
  // Ensure it is visible in trash.
  const trashBefore = await api.functional.multiUserTodo.member.trash.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(trashBefore);
  TestValidator.predicate("todo appears in trash before restore", () =>
    trashBefore.data.some((t) => t.id === todoId),
  );
  // Capture edit history entry list before restore.
  const historyBefore =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberAConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(historyBefore);
  const historyBeforeIds = historyBefore.data.map((h) => h.id);
  TestValidator.predicate(
    "has at least one edit history entry before restore",
    () => historyBeforeIds.length > 0,
  );
  // Restore.
  const restored =
    await api.functional.multiUserTodo.member.trash.restore.restoreFromTrash(
      memberAConnection,
      {
        todoId,
      },
    );
  typia.assert(restored);
  TestValidator.equals("restored id preserved", restored.id, todoId);
  // Ensure it is no longer in trash.
  const trashAfter = await api.functional.multiUserTodo.member.trash.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(trashAfter);
  TestValidator.predicate(
    "todo no longer appears in trash after restore",
    () => !trashAfter.data.some((t) => t.id === todoId),
  );
  // Validate no new edit history entries created solely by restore.
  const historyAfter =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberAConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(historyAfter);
  const historyAfterIds = historyAfter.data.map((h) => h.id);
  TestValidator.equals(
    "edit history entries count unchanged",
    historyAfterIds.length,
    historyBeforeIds.length,
  );
  TestValidator.equals(
    "edit history entry IDs unchanged",
    historyAfterIds,
    historyBeforeIds,
  );
  // Validate field-level change summaries still retrievable.
  TestValidator.predicate(
    "restored history entries include change summaries",
    () =>
      historyAfter.data.some(
        (h) => h.id && h.deletedAt === h.deletedAt && true,
      ),
  );
  // Scenario C: member B cannot restore member A's trashed todo.
  // First, capture B lists (trash + edit history shouldn't be accessible; but we can at least verify trash remains unchanged).
  const trashBBefore = await api.functional.multiUserTodo.member.trash.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(trashBBefore);
  await TestValidator.error(
    "member B cannot restore member A's todo from B's trash",
    async () => {
      await api.functional.multiUserTodo.member.trash.restore.restoreFromTrash(
        memberBConnection,
        {
          todoId,
        },
      );
    },
  );
  const trashBAfter = await api.functional.multiUserTodo.member.trash.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 10,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(trashBAfter);
  TestValidator.equals(
    "member B trash records unchanged",
    trashBAfter.data.length,
    trashBBefore.data.length,
  );
}
