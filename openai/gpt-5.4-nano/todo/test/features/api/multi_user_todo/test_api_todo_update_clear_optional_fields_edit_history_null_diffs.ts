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

export async function test_api_todo_update_clear_optional_fields_edit_history_null_diffs(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Create initial todo with optional fields set
  const initialTodo: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          startDate: RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24,
          ).toISOString(),
          dueDate: RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 48,
          ).toISOString(),
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(initialTodo);
  const todoId = initialTodo.id;
  // Fetch edit history before update to compare newest ordering
  const before =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(before);
  const beforeNewest = before.data[0];
  // 3) Clear optional fields via PUT
  const updated = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId,
      body: {
        edited_at: new Date().toISOString(),
        changes: null,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(updated);
  // 4) Fetch edit history after update and validate newest-first ordering
  const after =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(after);
  TestValidator.predicate(
    "has edit history entries after update",
    after.data.length >= 1,
  );
  const afterNewest = after.data[0];
  if (beforeNewest !== undefined) {
    TestValidator.predicate(
      "newest editedAt is not older than before",
      new Date(afterNewest!.editedAt).getTime() >=
        new Date(beforeNewest.editedAt).getTime(),
    );
  }
  if (after.data.length > 1) {
    TestValidator.predicate(
      "editedAt ordering is newest-first",
      new Date(after.data[0]!.editedAt).getTime() >=
        new Date(after.data[1]!.editedAt).getTime(),
    );
  }
  // 5) Validate that an edit happened (idempotency will be tested below)
  TestValidator.notEquals(
    "edit history newest id changed",
    beforeNewest?.id ?? null,
    afterNewest.id,
  );
  // 6) Scenario 2: idempotent repeat update and confirm no additional effective change
  const beforeRepeatNewestId = afterNewest.id;
  const beforeRepeatCount = after.data.length;
  await api.functional.multiUserTodo.member.todos.update(memberConnection, {
    todoId,
    body: {
      edited_at: new Date().toISOString(),
      changes: null,
    } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
  });
  const repeatAfter =
    await api.functional.multiUserTodo.member.todos.editHistory.index(
      memberConnection,
      {
        todoId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(repeatAfter);
  const repeatNewest = repeatAfter.data[0];
  // Accept either: stable newest id (no new entry) OR stable count (no effective change recorded)
  TestValidator.predicate(
    "idempotent update does not introduce an additional effective history change",
    repeatNewest.id === beforeRepeatNewestId ||
      repeatAfter.data.length <= beforeRepeatCount,
  );
}
