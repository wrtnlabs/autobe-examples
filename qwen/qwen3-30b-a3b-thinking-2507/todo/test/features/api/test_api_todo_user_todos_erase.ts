import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

export async function test_api_todo_user_todos_erase(
  connection: api.IConnection,
) {
  const output: ITodoTodo = await api.functional.todo.user.todos.erase(
    connection,
    {
      id: typia.random<string>(),
    },
  );
  typia.assert(output);
}
