import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_todo } from "../prepare/prepare_random_todo_app_todo";

export async function generate_random_todo_app_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodo.ICreate> | undefined;
  },
): Promise<ITodoAppTodo> {
  const prepared: ITodoAppTodo.ICreate = prepare_random_todo_app_todo(
    props.body,
  );
  return await api.functional.todoApp.member.todos.create(connection, {
    body: prepared,
  });
}
