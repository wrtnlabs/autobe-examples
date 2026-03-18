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

export async function test_api_todo_edit_history_change_delete_entry_scope_mismatch_not_deleted(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<boolean>(),
  } satisfies IMultiUserTodoMember.IJoin;
  await authorize_member_join(memberConnection, { body: member });
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    },
  );
  typia.assert(todo);
  const todoId = todo.id;
  // Perform two todo updates to generate two edit-history entries.
  const updateEntry1 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId,
      body: {
        changes: null,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(updateEntry1);
  const updateEntry2 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId,
      body: {
        changes: null,
      } satisfies IMultiUserTodoEditHistoryEntry.IUpdate,
    },
  );
  typia.assert(updateEntry2);
  const editHistoryEntryIdA = updateEntry1.id;
  const editHistoryEntryIdB = updateEntry2.id;
  // We cannot obtain concrete changeId values from the provided DTOs
  // because IMultiUserTodoEditHistoryEntryChange.ISummary.id is typed as null.
  // Use random UUIDs for required parameters, and verify that deletion with
  // mismatched scope does not make subsequent read succeed.
  const changeIdA = typia.random<string & tags.Format<"uuid">>();
  await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.erase(
    memberConnection,
    {
      todoId,
      editHistoryEntryId: editHistoryEntryIdB,
      changeId: changeIdA,
    },
  );
  await TestValidator.error(
    "changeIdA should not be deletable via mismatched editHistoryEntryId",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.at(
        memberConnection,
        {
          todoId,
          editHistoryEntryId: editHistoryEntryIdA,
          changeId: changeIdA,
        },
      );
    },
  );
  await TestValidator.error(
    "changeIdA should not appear under mismatched editHistoryEntryId",
    async () => {
      await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.at(
        memberConnection,
        {
          todoId,
          editHistoryEntryId: editHistoryEntryIdB,
          changeId: changeIdA,
        },
      );
    },
  );
}
