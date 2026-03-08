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
    todoAppMembers: IEntity;
    todoAppMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.startDate ?? null,
      due_date: props.body.dueDate ?? null,
      completed: false,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.todoAppMembers.id } },
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
