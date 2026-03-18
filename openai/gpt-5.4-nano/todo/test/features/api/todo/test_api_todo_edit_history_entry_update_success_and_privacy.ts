import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { generate_random_multi_user_todo_member_todos_edit_history_entries_create } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_edit_history_entry_update_success_and_privacy(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A join and connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2) Member B join and connections
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 3) Create a todo for member A
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo);
  // 4) Create an edit history entry for that todo
  const createdEntry =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberAConnection,
      {
        params: {
          todoId: todo.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(createdEntry);
  const todoId = todo.id;
  const editHistoryEntryId = createdEntry.id;
  // 5) Capture baseline state as member A
  const baseline =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
      },
    );
  typia.assert(baseline);
  // ---------- Scenario 1 (best-effort): update edited_at (per-field changes omitted due to DTO typing limitations) ----------
  const editedAt1 = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const updated1 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.update(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
        body: {
          edited_at: editedAt1,
        } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "editedAt updated (scenario 1)",
    updated1.editedAt,
    editedAt1,
  );
  const fetched1 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
      },
    );
  typia.assert(fetched1);
  TestValidator.equals(
    "changes preserved (scenario 1)",
    fetched1.changes,
    baseline.changes,
  );
  // ---------- Scenario 2: update edited_at only ----------
  const editedAt2 = RandomGenerator.date(
    new Date(),
    1000 * 60 * 120,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const updated2 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.update(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
        body: {
          edited_at: editedAt2,
        } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "editedAt updated (scenario 2)",
    updated2.editedAt,
    editedAt2,
  );
  const fetched2 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
      },
    );
  typia.assert(fetched2);
  TestValidator.equals(
    "changes preserved (scenario 2)",
    fetched2.changes,
    updated2.changes,
  );
  // ---------- Scenario 3: privacy boundary ----------
  const capturedForPrivacy =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
      },
    );
  typia.assert(capturedForPrivacy);
  await TestValidator.error(
    "member B must not update member A edit history entry",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.update(
        memberBConnection,
        {
          todoId,
          editHistoryEntryId,
          body: {
            edited_at: RandomGenerator.date(
              new Date(),
              1000 * 60 * 60,
            ).toISOString() satisfies string & tags.Format<"date-time">,
          } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
        },
      );
    },
  );
  const afterPrivacy =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.at(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
      },
    );
  typia.assert(afterPrivacy);
  TestValidator.equals(
    "editedAt unchanged after privacy failure",
    afterPrivacy.editedAt,
    capturedForPrivacy.editedAt,
  );
  TestValidator.equals(
    "changes unchanged after privacy failure",
    afterPrivacy.changes,
    capturedForPrivacy.changes,
  );
}
