import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_todo } from "../prepare/prepare_random_todo_todo";

export async function generate_random_todo_user_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoTodo.ICreate>;
  },
): Promise<ITodoTodo> {
  const prepared: ITodoTodo.ICreate = prepare_random_todo_todo(props.body);
  return await api.functional.todo.user.todos.create(connection, {
    body: prepared,
  });
}
