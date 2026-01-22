import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { prepare_random_todo_list_todo } from "../prepare/prepare_random_todo_list_todo";
export async function generate_random_todo_list_user_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoListTodo.ICreate>;
  },
): Promise<ITodoListTodo> {
  const prepared: ITodoListTodo.ICreate = prepare_random_todo_list_todo(
    props.body,
  );
  const result: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}
