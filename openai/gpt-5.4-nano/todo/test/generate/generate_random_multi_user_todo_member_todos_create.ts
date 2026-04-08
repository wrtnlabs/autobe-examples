import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_todo } from "../prepare/prepare_random_multi_user_todo_todo";

/**
 * Generate a random multi-user todo owned by the authenticated member via the API for E2E testing.
 *
 * Prepares random todo creation payload using the prepare function, then calls the creation endpoint
 * to persist the todo. The created todo entity owned by the requesting member is returned.
 */
export async function generate_random_multi_user_todo_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoTodo.ICreate> | undefined;
  },
): Promise<IMultiUserTodoTodo> {
  const prepared: IMultiUserTodoTodo.ICreate =
    prepare_random_multi_user_todo_todo(props.body);
  return await api.functional.multiUserTodo.member.todos.create(connection, {
    body: prepared,
  });
}
