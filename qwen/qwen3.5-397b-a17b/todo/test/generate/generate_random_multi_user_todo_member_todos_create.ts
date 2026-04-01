import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_todo } from "../prepare/prepare_random_multi_user_todo_todo";

export async function generate_random_multi_user_todo_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoTodo.ICreate> | undefined;
  },
): Promise<IMultiUserTodoTodo> {
  const prepared: IMultiUserTodoTodo.ICreate =
    prepare_random_multi_user_todo_todo(props.body);
  const result: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.create(connection, {
      body: prepared,
    });
  return result;
}
