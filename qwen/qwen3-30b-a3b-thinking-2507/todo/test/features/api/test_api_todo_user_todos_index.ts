import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";

export async function test_api_todo_user_todos_index(
  connection: api.IConnection,
) {
  const output: IPageITodoTodo.ISummary =
    await api.functional.todo.user.todos.index(connection);
  typia.assert(output);
}
