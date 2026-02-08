import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoTodoCollector {
  export async function collect(props: {
    body: IMultiUserTodoTodo.ICreate;
    user: IEntity;
  }) {
    const id = v4();
    return {
      id,
      title: "",
      description: null,
      start_date: null,
      due_date: null,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.user.id } },
      // multi_user_todo_todo_edit_histories is not created here
    } satisfies Prisma.multi_user_todo_todosCreateInput;
  }
}
