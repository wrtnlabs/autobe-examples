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

export async function test_api_todo_edit_history_change_privacy_blocked_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Member A creates a todo
  const todo: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(
      memberAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          startDate: null,
          dueDate: null,
        } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
      },
    );
  typia.assert(todo);
  // Member A updates the todo to generate an edit-history event with field-level changes
  const updated: IMultiUserTodoEditHistoryEntry =
    await api.functional.multiUserTodo.member.todos.update(memberAConnection, {
      todoId: todo.id,
      body: {
        edited_at: new Date().toISOString(),
        changes: null,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    });
  typia.assert(updated);
  TestValidator.predicate(
    "should have at least one change record",
    () => updated.changes.length > 0,
  );
  const editHistoryEntryId = updated.id;
  const changeId = typia.assert<
    string & tags.Format<"uuid">
  >(updated.changes[0]!.id);
  // Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  await TestValidator.error(
    "cross-user edit-history change access should be blocked",
    async () => {
      try {
        await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.at(
          memberBConnection,
          {
            todoId: todo.id,
            editHistoryEntryId,
            changeId,
          },
        );
      } catch (exp) {
        const message = exp instanceof Error ? exp.message : String(exp);
        // Anti-leakage: error should not include field-level change content
        TestValidator.predicate(
          "error should not include changedField",
          !message.includes("changedField"),
        );
        TestValidator.predicate(
          "error should not include fromValue",
          !message.includes("fromValue"),
        );
        TestValidator.predicate(
          "error should not include toValue",
          !message.includes("toValue"),
        );
        throw exp;
      }
    },
  );
}
