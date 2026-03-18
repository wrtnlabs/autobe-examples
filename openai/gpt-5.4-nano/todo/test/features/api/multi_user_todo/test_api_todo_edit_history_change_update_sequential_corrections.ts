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
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_edit_history_change_update_sequential_corrections(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: sequential corrections.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create a todo that will later have edit history and change records.
  // Use generator helper to ensure supported seed state.
  const todoForA = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todoForA);

  // Create an explicit todo update to generate edit history/change identifiers.
  const correctionSeedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todoAfterFirstEdit =
    await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
      todoId: todoForA.id,
      body: typia.assert<IMultiUserTodoEditHistoryEntry.IUpdate>({
        title: correctionSeedTitle,
        description: null,
      } as unknown as IMultiUserTodoEditHistoryEntry.IUpdate),
    });
  typia.assert(todoAfterFirstEdit);

  TestValidator.predicate(
    "has at least one change record",
    () => (todoAfterFirstEdit.changes?.length ?? 0) > 0,
  );

  const firstChangeSummary = todoAfterFirstEdit.changes[0]!;
  const changeId = firstChangeSummary.id satisfies null as unknown as never;

  // Therefore perform a second todo update via edit history entry update endpoint
  // to directly target a changeId by generating one through an allowed operation.
  const secondEditTitle = RandomGenerator.paragraph({ sentences: 1 });
  const editEntry2 = await api.functional.multiUserTodo.member.todos.update(
    memberAConnection,
    {
      todoId: todoAfterFirstEdit.id,
      body: typia.assert<IMultiUserTodoEditHistoryEntry.IUpdate>({
        title: secondEditTitle,
      } as unknown as IMultiUserTodoEditHistoryEntry.IUpdate),
    },
  );
  typia.assert(editEntry2);

  const targetChange = editEntry2.changes[0]!;
  const targetChangeId = targetChange.id as unknown as string &
    tags.Format<"uuid">;
  const targetChangedField = targetChange.changedField as unknown as string;

  const currentBeforeAfter =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId: todoAfterFirstEdit.id,
        editHistoryEntryId: editEntry2.id,
        changeId: targetChangeId,
        body: {
          changed_field: targetChangedField,
          from_value: targetChange.fromValue as string | null,
          to_value: targetChange.toValue as string | null,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(currentBeforeAfter);

  // Correction A
  const fromValueA: string | null = currentBeforeAfter.fromValue;
  const toValueA: string | null = RandomGenerator.paragraph({ sentences: 1 });
  const editResp1 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId: todoAfterFirstEdit.id,
        editHistoryEntryId: editEntry2.id,
        changeId: currentBeforeAfter.id,
        body: {
          changed_field: currentBeforeAfter.changedField,
          from_value: fromValueA,
          to_value: toValueA,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(editResp1);

  const updatedAt1 = editResp1.updatedAt;

  // Correction B
  const fromValueB: string | null = editResp1.fromValue;
  const toValueB: string | null = RandomGenerator.paragraph({ sentences: 1 });
  const editResp2 =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId: todoAfterFirstEdit.id,
        editHistoryEntryId: editEntry2.id,
        changeId: editResp1.id,
        body: {
          changed_field: editResp1.changedField,
          from_value: fromValueB,
          to_value: toValueB,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(editResp2);

  TestValidator.equals(
    "changedField reflects correction B",
    editResp2.changedField,
    editResp1.changedField,
  );
  TestValidator.equals(
    "fromValue reflects correction B",
    editResp2.fromValue,
    fromValueB,
  );
  TestValidator.equals(
    "toValue reflects correction B",
    editResp2.toValue,
    toValueB,
  );
  TestValidator.predicate(
    "updatedAt increases after sequential correction",
    editResp2.updatedAt > updatedAt1,
  );

  // Scenario 2: no-op correction behavior.
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });

  const noopResp =
    await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
      memberAConnection,
      {
        todoId: todoAfterFirstEdit.id,
        editHistoryEntryId: editEntry2.id,
        changeId: editResp2.id,
        body: {
          changed_field: editResp2.changedField,
          from_value: editResp2.fromValue,
          to_value: editResp2.toValue,
        } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
      },
    );
  typia.assert(noopResp);

  TestValidator.equals(
    "no-op toValue unchanged",
    noopResp.toValue,
    editResp2.toValue,
  );

  // Scenario 3: cross-user isolation.
  await TestValidator.error(
    "member B cannot update member A change record",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.updateTodoEditHistoryEntryChange(
        memberBConnection,
        {
          todoId: todoAfterFirstEdit.id,
          editHistoryEntryId: editEntry2.id,
          changeId: editResp2.id,
          body: {
            changed_field: editResp2.changedField,
            from_value: editResp2.fromValue,
            to_value: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IMultiUserTodoEditHistoryEntryChange.IUpdate,
        },
      );
    },
  );
}
