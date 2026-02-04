import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppTodoCollector {
  export async function collect(props: {
    body: ITodoAppTodo.ICreate;
    todoAppUsers: IEntity;
    todoAppUserSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.start_date ?? null,
      due_date: props.body.due_date ?? null,
      completion_status: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: {
        connect: { id: props.todoAppUsers.id },
      },
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
