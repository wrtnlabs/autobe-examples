import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { prepare_random_todo_app_todo_edit_history } from "../prepare/prepare_random_todo_app_todo_edit_history";
export async function generate_random_todo_app_todo_user_todos_edit_histories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodoEditHistory.ICreate> | undefined;
    params: {
      todoId: string;
    };
  },
): Promise<ITodoAppTodoEditHistory> {
  const prepared: ITodoAppTodoEditHistory.ICreate =
    prepare_random_todo_app_todo_edit_history(props.body);
  return await api.functional.todoApp.todoUser.todos.edit_histories.create(
    connection,
    {
      todoId: props.params.todoId,
      body: prepared,
    },
  );
}
