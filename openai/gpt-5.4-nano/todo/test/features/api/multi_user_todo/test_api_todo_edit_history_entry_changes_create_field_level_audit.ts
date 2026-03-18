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

export async function test_api_todo_edit_history_entry_changes_create_field_level_audit(
  connection: api.IConnection,
): Promise<void> {
  // Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create a todo owned by member A
  const todoA = await api.functional.multiUserTodo.member.todos.create(
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
  // Create an edit history entry for that todo
  const editHistoryEntryA =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.create(
      memberAConnection,
      {
        todoId: todoA.id,
        body: {
          title: RandomGenerator.name(),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(editHistoryEntryA);
  // Scenario A: create field-level changes (one by one)
  const changeTitle: IMultiUserTodoEditHistoryEntryChange.ICreate = {
    changedField: "title",
    fromValue: null,
    toValue: RandomGenerator.name(),
  };
  const changeDueDate: IMultiUserTodoEditHistoryEntryChange.ICreate = {
    changedField: "due_date",
    fromValue: null,
    toValue: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const createdTitle =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
      memberAConnection,
      {
        todoId: todoA.id,
        editHistoryEntryId: editHistoryEntryA.id,
        body: changeTitle,
      },
    );
  typia.assert(createdTitle);
  TestValidator.equals(
    "createdTitle.changedField",
    createdTitle.changedField,
    changeTitle.changedField,
  );
  TestValidator.equals(
    "createdTitle.fromValue",
    createdTitle.fromValue,
    changeTitle.fromValue,
  );
  TestValidator.equals(
    "createdTitle.toValue",
    createdTitle.toValue,
    changeTitle.toValue,
  );
  TestValidator.equals("createdTitle.deletedAt", createdTitle.deletedAt, null);
  TestValidator.predicate(
    "createdTitle.createdAt present",
    createdTitle.createdAt.length > 0,
  );
  TestValidator.predicate(
    "createdTitle.updatedAt present",
    createdTitle.updatedAt.length > 0,
  );
  const createdDueDate =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
      memberAConnection,
      {
        todoId: todoA.id,
        editHistoryEntryId: editHistoryEntryA.id,
        body: changeDueDate,
      },
    );
  typia.assert(createdDueDate);
  TestValidator.equals(
    "createdDueDate.changedField",
    createdDueDate.changedField,
    changeDueDate.changedField,
  );
  TestValidator.equals(
    "createdDueDate.fromValue",
    createdDueDate.fromValue,
    changeDueDate.fromValue,
  );
  TestValidator.equals(
    "createdDueDate.toValue",
    createdDueDate.toValue,
    changeDueDate.toValue,
  );
  TestValidator.equals(
    "createdDueDate.deletedAt",
    createdDueDate.deletedAt,
    null,
  );
  TestValidator.predicate(
    "createdDueDate.createdAt present",
    createdDueDate.createdAt.length > 0,
  );
  TestValidator.predicate(
    "createdDueDate.updatedAt present",
    createdDueDate.updatedAt.length > 0,
  );
  // Scenario B: meaningful-change rule (no-op). If system rejects, request should throw.
  const editHistoryEntryB =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.create(
      memberAConnection,
      {
        todoId: todoA.id,
        body: {
          title: RandomGenerator.name(),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(editHistoryEntryB);
  const noOpChange: IMultiUserTodoEditHistoryEntryChange.ICreate = {
    changedField: "title",
    fromValue: RandomGenerator.name(),
    toValue: RandomGenerator.name(),
  };
  // Ensure no-op by using the same value.
  noOpChange.fromValue = noOpChange.toValue;
  const meaningfulChange: IMultiUserTodoEditHistoryEntryChange.ICreate = {
    changedField: "description",
    fromValue: null,
    toValue: RandomGenerator.paragraph({ sentences: 1 }),
  };
  // Create meaningful change always (should succeed)
  const createdMeaningful =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
      memberAConnection,
      {
        todoId: todoA.id,
        editHistoryEntryId: editHistoryEntryB.id,
        body: meaningfulChange,
      },
    );
  typia.assert(createdMeaningful);
  TestValidator.equals(
    "meaningful.changedField",
    createdMeaningful.changedField,
    meaningfulChange.changedField,
  );
  TestValidator.equals(
    "meaningful.fromValue",
    createdMeaningful.fromValue,
    meaningfulChange.fromValue,
  );
  TestValidator.equals(
    "meaningful.toValue",
    createdMeaningful.toValue,
    meaningfulChange.toValue,
  );
  // Try no-op change. Either it is rejected or it is not persisted.
  // Since we have no retrieval endpoint, accept either thrown error or successful
  // response that matches no-op.
  const noOpAttempt = await TestValidator.error(
    "no-op change should be rejected or not persisted",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
        memberAConnection,
        {
          todoId: todoA.id,
          editHistoryEntryId: editHistoryEntryB.id,
          body: noOpChange,
        },
      );
    },
  );
  void noOpAttempt;
  // Scenario C: ownership boundary
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  await TestValidator.error(
    "member B cannot create changes for member A todo/edit history",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
        memberBConnection,
        {
          todoId: todoA.id,
          editHistoryEntryId: editHistoryEntryA.id,
          body: {
            changedField: "title",
            fromValue: "x",
            toValue: "y",
          } satisfies IMultiUserTodoEditHistoryEntryChange.ICreate,
        },
      );
    },
  );
}
