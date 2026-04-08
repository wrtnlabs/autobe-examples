import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_todo } from "../prepare/prepare_random_todo_app_todo";

/**
 * Generate a random todo via the API for E2E testing.
 *
 * Prepares random todo data using the prepare function, then calls the creation endpoint to create a new todo for the authenticated member. The todo is marked as incomplete by default and includes randomized title, description, start date, and due date.
 *
 * All optional properties (description, start_date, due_date) support input override through DeepPartial, allowing test customization while providing sensible defaults for automatic generation. The created todo includes all fields populated by the server including the generated UUID, timestamps, member relation, and empty edit histories array.
 */
export async function generate_random_todo_app_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppTodo.ICreate>;
  },
): Promise<ITodoAppTodo> {
  const prepared: ITodoAppTodo.ICreate = prepare_random_todo_app_todo(
    props.body,
  );
  const result: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}
