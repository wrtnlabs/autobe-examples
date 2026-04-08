import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_multi_user_todo_todo } from "../prepare/prepare_random_multi_user_todo_todo";

/**
 * Generate a random todo item via the API for E2E testing.
 *
 * Creates a new todo with randomized data using the prepare function, then calls the
 * creation endpoint to persist the todo in the database. The todo includes a random
 * title (3-5 words), description (2 paragraphs with 5-10 sentences), and optional
 * date fields for scheduling. Authentication is required but handled separately in
 * test scenarios.
 */
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
