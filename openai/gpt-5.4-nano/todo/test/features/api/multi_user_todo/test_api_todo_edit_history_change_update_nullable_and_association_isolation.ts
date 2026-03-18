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

export async function test_api_todo_edit_history_change_update_nullable_and_association_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const nowIso = new Date().toISOString();
  // ===================== Scenario 1 (targeted nullable update) =====================
  const todoA = await generate_random_multi_user_todo_member_todos_create(
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
  typia.assert(todoA);
  const editEntryA =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberAConnection,
      {
        params: { todoId: todoA.id },
        body: {
          title: RandomGenerator.name(),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(editEntryA);
  const createdChangeA =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberAConnection,
      {
        params: { todoId: todoA.id, editHistoryEntryId: editEntryA.id },
        body: {
          changedField: "due_date",
          fromValue: null,
          toValue: nowIso,
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(createdChangeA);
  const beforeA = createdChangeA;
  const updatedChangeA =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId: todoA.id,
        editHistoryEntryId: editEntryA.id,
        changeId: beforeA.id,
        body: {
          changed_field: beforeA.changedField,
          from_value: null,
          to_value: null,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(updatedChangeA);
  TestValidator.equals(
    "scenario1: changedField updated",
    updatedChangeA.changedField,
    beforeA.changedField,
  );
  TestValidator.equals(
    "scenario1: fromValue is null",
    updatedChangeA.fromValue,
    null,
  );
  TestValidator.equals(
    "scenario1: toValue is null",
    updatedChangeA.toValue,
    null,
  );
  TestValidator.predicate(
    "scenario1: updatedAt advanced",
    updatedChangeA.updatedAt !== beforeA.updatedAt,
  );
  // ===================== Scenario 2 (only targeted change updatedAt) =====================
  // Create another edit entry with two changes
  const editEntryB =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberAConnection,
      {
        params: { todoId: todoA.id },
        body: {
          title: RandomGenerator.name(),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(editEntryB);
  const createdChangeB1 =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberAConnection,
      {
        params: { todoId: todoA.id, editHistoryEntryId: editEntryB.id },
        body: {
          changedField: "start_date",
          fromValue: null,
          toValue: nowIso,
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(createdChangeB1);
  const createdChangeB2 =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberAConnection,
      {
        params: { todoId: todoA.id, editHistoryEntryId: editEntryB.id },
        body: {
          changedField: "description",
          fromValue: null,
          toValue: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(createdChangeB2);
  const beforeB1 = createdChangeB1;
  const beforeB2 = createdChangeB2;
  const updatedB1 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId: todoA.id,
        editHistoryEntryId: editEntryB.id,
        changeId: beforeB1.id,
        body: {
          changed_field: beforeB1.changedField,
          from_value: null,
          to_value: null,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(updatedB1);
  TestValidator.equals(
    "scenario2: B1 changedField",
    updatedB1.changedField,
    beforeB1.changedField,
  );
  TestValidator.equals("scenario2: B1 fromValue", updatedB1.fromValue, null);
  TestValidator.equals("scenario2: B1 toValue", updatedB1.toValue, null);
  TestValidator.predicate(
    "scenario2: B1 updatedAt advanced",
    updatedB1.updatedAt !== beforeB1.updatedAt,
  );
  // Validate B2 unchanged by performing a no-op update with current values and expecting updatedAt unchanged.
  const noOpB2 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId: todoA.id,
        editHistoryEntryId: editEntryB.id,
        changeId: beforeB2.id,
        body: {
          changed_field: beforeB2.changedField,
          from_value: beforeB2.fromValue,
          to_value: beforeB2.toValue,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(noOpB2);
  TestValidator.equals(
    "scenario2: B2 fromValue unchanged",
    noOpB2.fromValue,
    beforeB2.fromValue,
  );
  TestValidator.equals(
    "scenario2: B2 toValue unchanged",
    noOpB2.toValue,
    beforeB2.toValue,
  );
  TestValidator.equals(
    "scenario2: B2 updatedAt unchanged",
    noOpB2.updatedAt,
    beforeB2.updatedAt,
  );
  // ===================== Scenario 3 (cross-resource isolation / association mismatch) =====================
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoB);
  const editEntryB3 =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_create(
      memberBConnection,
      {
        params: { todoId: todoB.id },
        body: {
          title: RandomGenerator.name(),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(editEntryB3);
  const createdChangeB3_1 =
    await generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
      memberBConnection,
      {
        params: { todoId: todoB.id, editHistoryEntryId: editEntryB3.id },
        body: {
          changedField: "due_date",
          fromValue: null,
          toValue: nowIso,
        } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
      },
    );
  typia.assert(createdChangeB3_1);
  const beforeA2 = updatedChangeA;
  const beforeB3_1 = createdChangeB3_1;
  await TestValidator.httpError(
    "scenario3: association mismatch rejected",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
        memberAConnection,
        {
          todoId: todoB.id,
          editHistoryEntryId: editEntryB3.id,
          changeId: beforeA2.id,
          body: {
            changed_field: beforeA2.changedField,
            from_value: beforeA2.fromValue,
            to_value: beforeA2.toValue,
          } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
        },
      );
    },
  );
  // Validate no modification occurred via no-op updates expecting no updatedAt change.
  const noOpA2 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId: todoA.id,
        editHistoryEntryId: editEntryA.id,
        changeId: beforeA2.id,
        body: {
          changed_field: beforeA2.changedField,
          from_value: beforeA2.fromValue,
          to_value: beforeA2.toValue,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(noOpA2);
  TestValidator.equals(
    "scenario3: A2 fromValue unchanged",
    noOpA2.fromValue,
    beforeA2.fromValue,
  );
  TestValidator.equals(
    "scenario3: A2 toValue unchanged",
    noOpA2.toValue,
    beforeA2.toValue,
  );
  TestValidator.equals(
    "scenario3: A2 updatedAt unchanged",
    noOpA2.updatedAt,
    beforeA2.updatedAt,
  );
  const noOpB3_1 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberBConnection,
      {
        todoId: todoB.id,
        editHistoryEntryId: editEntryB3.id,
        changeId: beforeB3_1.id,
        body: {
          changed_field: beforeB3_1.changedField,
          from_value: beforeB3_1.fromValue,
          to_value: beforeB3_1.toValue,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(noOpB3_1);
  TestValidator.equals(
    "scenario3: B3_1 fromValue unchanged",
    noOpB3_1.fromValue,
    beforeB3_1.fromValue,
  );
  TestValidator.equals(
    "scenario3: B3_1 toValue unchanged",
    noOpB3_1.toValue,
    beforeB3_1.toValue,
  );
  TestValidator.equals(
    "scenario3: B3_1 updatedAt unchanged",
    noOpB3_1.updatedAt,
    beforeB3_1.updatedAt,
  );
}
