import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_todo_history_entry } from "../prepare/prepare_random_todo_app_todo_history_entry";

export async function generate_random_todo_app_member_todos_history_create_todo_history_entry(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodoHistoryEntry.ICreate> | undefined;
    params: {
      todoId: string;
    };
  },
): Promise<ITodoAppTodoHistoryEntry> {
  const prepared: ITodoAppTodoHistoryEntry.ICreate =
    prepare_random_todo_app_todo_history_entry(props.body);
  return await api.functional.todoApp.member.todos.history.createTodoHistoryEntry(
    connection,
    {
      body: prepared,
      todoId: props.params.todoId as string & tags.Format<"uuid">,
    },
  );
}
