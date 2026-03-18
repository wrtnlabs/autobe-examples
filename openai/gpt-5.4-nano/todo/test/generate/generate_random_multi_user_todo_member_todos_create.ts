import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_edit_history_entry } from "../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function generate_random_multi_user_todo_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoEditHistoryEntry.ICreate> | undefined;
  },
): Promise<IMultiUserTodoEditHistoryEntry> {
  const prepared: IMultiUserTodoEditHistoryEntry.ICreate =
    prepare_random_multi_user_todo_edit_history_entry(props.body);
  const result: IMultiUserTodoEditHistoryEntry =
    await api.functional.multiUserTodo.member.todos.create(connection, {
      body: prepared,
    });
  return result;
}
