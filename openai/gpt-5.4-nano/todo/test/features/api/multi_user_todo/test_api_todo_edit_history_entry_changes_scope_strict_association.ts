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
import typia from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes";
import { generate_random_multi_user_todo_member_todos_edit_history_entries_create } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";
import { prepare_random_multi_user_todo_edit_history_entry_change } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry_change";

export async function test_api_todo_edit_history_entry_changes_scope_strict_association(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(auth);

  // 2) Create a todo owned by this member.
  const todo: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {},
    );
  typia.assert(todo);

  const todoId: string = todo.id;

  // 3) Create two separate edit history entries for the same todo.
  const editHistoryEntry1: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberConnection,
      {
        params: { todoId },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(editHistoryEntry1);

  const editHistoryEntry2: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberConnection,
      {
        params: { todoId },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(editHistoryEntry2);

  const editHistoryEntryId1: string = editHistoryEntry1.id;
  const editHistoryEntryId2: string = editHistoryEntry2.id;

  // 4) Create a change record intentionally scoped to editHistoryEntryId_2.
  // Choose a deterministic, distinct payload.
  const changedField2: string = "title";
  const fromValue2: string | null = "before-2";
  const toValue2: string | null = "after-2";
  const createdChange2: IMultiUserTodoEditHistoryEntryChange =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberConnection,
      {
        params: { todoId, editHistoryEntryId: editHistoryEntryId2 },
        body: {
          changedField: changedField2,
          fromValue: fromValue2,
          toValue: toValue2,
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(createdChange2);

  // 5) Validate strict association indirectly: create a control change under entry1
  // and ensure returned change payload matches the scoped request.
  const changedField1: string = "title";
  const fromValue1: string | null = "before-1";
  const toValue1: string | null = "after-1";
  const createdChange1: IMultiUserTodoEditHistoryEntryChange =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberConnection,
      {
        params: { todoId, editHistoryEntryId: editHistoryEntryId1 },
        body: {
          changedField: changedField1,
          fromValue: fromValue1,
          toValue: toValue1,
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(createdChange1);

  // 7) Id/timestamp and payload consistency checks (within what is possible
  // without dedicated read endpoints for scoping).
  TestValidator.equals(
    "change 2 changedField",
    createdChange2.changedField,
    changedField2,
  );
  TestValidator.equals(
    "change 2 fromValue",
    createdChange2.fromValue,
    fromValue2,
  );
  TestValidator.equals("change 2 toValue", createdChange2.toValue, toValue2);
  TestValidator.equals(
    "change 1 fromValue",
    createdChange1.fromValue,
    fromValue1,
  );
  TestValidator.equals("change 1 toValue", createdChange1.toValue, toValue1);
  TestValidator.notEquals(
    "created change ids differ",
    createdChange1.id,
    createdChange2.id,
  );
  TestValidator.notEquals(
    "created change updatedAt differ",
    createdChange1.updatedAt,
    createdChange2.updatedAt,
  );
}
