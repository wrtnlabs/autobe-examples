import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_edit_history_entry_change } from "../prepare/prepare_random_multi_user_todo_edit_history_entry_change";

export async function generate_random_multi_user_todo_member_todos_edit_history_entries_changes_create_changes(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IMultiUserTodoEditHistoryEntryChange.ICreate>
      | undefined;
    params: {
      todoId: string;
      editHistoryEntryId: string;
    };
  },
): Promise<IMultiUserTodoEditHistoryEntryChange> {
  const prepared: IMultiUserTodoEditHistoryEntryChange.ICreate =
    prepare_random_multi_user_todo_edit_history_entry_change(props.body);
  return await api.functional.multiUserTodo.member.todos.editHistoryEntries.changes.createChanges(
    connection,
    {
      body: prepared,
      todoId: props.params.todoId,
      editHistoryEntryId: props.params.editHistoryEntryId,
    },
  );
}
