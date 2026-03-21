import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import api from "@ORGANIZATION/PROJECT-api";
import { prepare_random_multi_user_todo_todo } from "../../test/prepare/prepare_random_multi_user_todo_todo";

export async function generate_random_multi_user_todo_member_todos_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMultiUserTodoTodo.ICreate>;
  }
): Promise<IMultiUserTodoTodo> {
  const prepared: IMultiUserTodoTodo.ICreate = prepare_random_multi_user_todo_todo(props.body);
  const result: IMultiUserTodoTodo = await api.functional.multiUserTodo.member.todos.create(
    connection,
    {
      body: prepared,
    }
  );
  return result;
}