import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_private_todo_app_todo } from "../prepare/prepare_random_private_todo_app_todo";

export async function generate_random_private_todo_app_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IPrivateTodoAppTodo.ICreate>;
  },
): Promise<IPrivateTodoAppTodo> {
  const prepared: IPrivateTodoAppTodo.ICreate =
    prepare_random_private_todo_app_todo(props.body);
  const result: IPrivateTodoAppTodo =
    await api.functional.privateTodoApp.member.todos.create(connection, {
      body: prepared,
    });
  return result;
}
