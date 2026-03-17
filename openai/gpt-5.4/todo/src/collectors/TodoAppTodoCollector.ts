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
    member: IEntity;
  }) {
    const now: Date = new Date();
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date:
        props.body.startDate != null ? new Date(props.body.startDate) : null,
      due_date:
        props.body.dueDate != null ? new Date(props.body.dueDate) : null,
      completed: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: {
          id: props.member.id,
        },
      },
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
