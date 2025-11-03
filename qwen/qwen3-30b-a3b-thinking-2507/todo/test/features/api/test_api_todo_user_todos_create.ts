import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

export async function test_api_todo_user_todos_create(
  connection: api.IConnection,
) {
  const output: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: typia.random<ITodoTodo.ICreate>(),
    },
  );
  typia.assert(output);
}
