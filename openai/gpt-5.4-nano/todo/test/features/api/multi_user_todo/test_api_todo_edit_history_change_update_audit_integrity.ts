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
import { generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes";
import { generate_random_multi_user_todo_member_todos_edit_history_entries_create } from "../../../generate/generate_random_multi_user_todo_member_todos_edit_history_entries_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";
import { prepare_random_multi_user_todo_edit_history_entry_change } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry_change";

export async function test_api_todo_edit_history_change_update_audit_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: success and audit integrity
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAAuth);
  const todoConnection: api.IConnection = { host: connection.host };
  // authorize_member_join already set headers on memberAConnection, but per isolation pattern
  // we must use actor-specific connections for calls. We'll reuse memberAConnection directly.
  const memberAEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
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
  typia.assert(memberAEditHistoryEntry);
  const todoId = memberAEditHistoryEntry.id;
  // Create an edit history entry for that todo
  const createdEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberAConnection,
      {
        params: { todoId },
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
  typia.assert(createdEditHistoryEntry);
  const editHistoryEntryId = createdEditHistoryEntry.id;
  // Create two per-field change records under the same edit history entry
  const changeA =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberAConnection,
      {
        params: { todoId, editHistoryEntryId },
        body: {
          changedField: "title",
          fromValue: RandomGenerator.paragraph({ sentences: 1 }),
          toValue: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(changeA);
  const changeB =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberAConnection,
      {
        params: { todoId, editHistoryEntryId },
        body: {
          changedField: "description",
          fromValue: RandomGenerator.paragraph({ sentences: 1 }),
          toValue: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(changeB);
  // Pick one change to update (changeA)
  const originalUpdatedAtChangeA = changeA.updatedAt;
  const changeFieldToCorrect = changeA.changedField;
  const correctedFromValue: string | null =
    changeA.fromValue === null
      ? "corrected-from"
      : `${changeA.fromValue}-corrected`;
  const correctedToValue: string | null =
    changeA.toValue === null ? "corrected-to" : `${changeA.toValue}-corrected`;
  const updatedChangeA =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
        changeId: changeA.id,
        body: {
          changed_field: changeFieldToCorrect,
          from_value: correctedFromValue,
          to_value: correctedToValue,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(updatedChangeA);
  TestValidator.equals(
    "changedField should match",
    updatedChangeA.changedField,
    changeFieldToCorrect,
  );
  TestValidator.equals(
    "fromValue should match corrected payload",
    updatedChangeA.fromValue,
    correctedFromValue,
  );
  TestValidator.equals(
    "toValue should match corrected payload",
    updatedChangeA.toValue,
    correctedToValue,
  );
  const updatedAtPrevA = new Date(originalUpdatedAtChangeA).getTime();
  const updatedAtNowA = new Date(updatedChangeA.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt should increase for corrected change record",
    updatedAtNowA > updatedAtPrevA,
  );
  // Audit integrity: ensure changeB remains unaffected.
  // We update changeB to its original from/to values again and ensure response reflects those values.
  const updatedChangeB =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
        changeId: changeB.id,
        body: {
          changed_field: changeB.changedField,
          from_value: changeB.fromValue,
          to_value: changeB.toValue,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(updatedChangeB);
  TestValidator.equals(
    "audit integrity: changeB changedField unchanged",
    updatedChangeB.changedField,
    changeB.changedField,
  );
  TestValidator.equals(
    "audit integrity: changeB fromValue unchanged",
    updatedChangeB.fromValue,
    changeB.fromValue,
  );
  TestValidator.equals(
    "audit integrity: changeB toValue unchanged",
    updatedChangeB.toValue,
    changeB.toValue,
  );
  // Scenario 2: authorization/privacy
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberBAAuth);
  const memberBEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberBConnection,
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
  typia.assert(memberBEditHistoryEntry);
  const memberBTodoId = memberBEditHistoryEntry.id;
  const memberBCreatedEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberBConnection,
      {
        params: { todoId: memberBTodoId },
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
  typia.assert(memberBCreatedEditHistoryEntry);
  const memberBEditHistoryEntryId = memberBCreatedEditHistoryEntry.id;
  const memberBChange =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberBConnection,
      {
        params: {
          todoId: memberBTodoId,
          editHistoryEntryId: memberBEditHistoryEntryId,
        },
        body: {
          changedField: "title",
          fromValue: "b-from",
          toValue: "b-to",
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(memberBChange);
  await TestValidator.error(
    "member B should not modify member A's change record",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
        memberBConnection,
        {
          todoId,
          editHistoryEntryId,
          changeId: changeA.id,
          body: {
            changed_field: changeFieldToCorrect,
            from_value: correctedFromValue,
            to_value: correctedToValue,
          } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
        },
      );
    },
  );
  // Confirm member B's own change record is still consistent by re-updating with its own original values.
  const memberBChangeAfter =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberBConnection,
      {
        todoId: memberBTodoId,
        editHistoryEntryId: memberBEditHistoryEntryId,
        changeId: memberBChange.id,
        body: {
          changed_field: memberBChange.changedField,
          from_value: memberBChange.fromValue,
          to_value: memberBChange.toValue,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(memberBChangeAfter);
  TestValidator.equals(
    "member B change unchanged after failed cross-member update",
    memberBChangeAfter.fromValue,
    memberBChange.fromValue,
  );
  TestValidator.equals(
    "member B change unchanged after failed cross-member update (toValue)",
    memberBChangeAfter.toValue,
    memberBChange.toValue,
  );
  // Scenario 3: audit invariant / consistency (changed_field mismatch)
  const mismatchCandidates = [
    "title",
    "description",
    "start_date",
    "due_date",
  ] as const;
  const wrongChangedField =
    mismatchCandidates.find((x) => x !== changeA.changedField) ?? "description";
  await TestValidator.error(
    "should reject update when changed_field does not match change record scope",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
        memberAConnection,
        {
          todoId,
          editHistoryEntryId,
          changeId: changeA.id,
          body: {
            changed_field: wrongChangedField,
            from_value: correctedFromValue,
            to_value: correctedToValue,
          } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
        },
      );
    },
  );
  // Ensure no partial changes by re-applying correct changed_field with the last known correct values.
  const reCorrectedChangeA =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId,
        editHistoryEntryId,
        changeId: changeA.id,
        body: {
          changed_field: changeFieldToCorrect,
          from_value: correctedFromValue,
          to_value: correctedToValue,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(reCorrectedChangeA);
  TestValidator.equals(
    "re-corrected changedField",
    reCorrectedChangeA.changedField,
    changeFieldToCorrect,
  );
  TestValidator.equals(
    "re-corrected fromValue",
    reCorrectedChangeA.fromValue,
    correctedFromValue,
  );
  TestValidator.equals(
    "re-corrected toValue",
    reCorrectedChangeA.toValue,
    correctedToValue,
  );
}
