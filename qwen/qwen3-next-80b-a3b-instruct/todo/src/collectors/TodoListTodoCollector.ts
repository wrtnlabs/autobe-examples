import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoListTodoCollector {
  export async function collect(props: {
    body: ITodoListTodo.ICreate;
    todoListUser: IEntity;
    todoListUserSession: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.details ?? null,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: {
        connect: { id: props.todoListUser.id },
      },
    } satisfies Prisma.todo_list_todosCreateInput;
  }
}
