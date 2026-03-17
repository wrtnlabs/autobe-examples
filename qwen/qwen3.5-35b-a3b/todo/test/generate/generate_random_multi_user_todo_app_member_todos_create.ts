import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_app_todo } from "../prepare/prepare_random_multi_user_todo_app_todo";

export async function generate_random_multi_user_todo_app_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoAppTodo.ICreate> | undefined;
  },
): Promise<IMultiUserTodoAppTodo> {
  const prepared: IMultiUserTodoAppTodo.ICreate =
    prepare_random_multi_user_todo_app_todo(props.body);
  const result: IMultiUserTodoAppTodo =
    await api.functional.multiUserTodoApp.member.todos.create(connection, {
      body: prepared,
    });
  return result;
}
