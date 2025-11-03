import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

export async function test_api_todo_todos_at(connection: api.IConnection) {
  const output: ITodoTodo = await api.functional.todo.todos.at(connection, {
    todoId: typia.random<string>(),
  });
  typia.assert(output);
}
