import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

class TodoTodoCollector {
  static async collect(props: {
    body: ITodoTodo.ICreate;
    todoUsers: IEntity;
    todoUserSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.start_date ?? null,
      due_date: props.body.due_date ?? null,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: {
        connect: { id: props.todoUsers.id },
      },
    } satisfies Prisma.todo_todosCreateInput;
  }
}
