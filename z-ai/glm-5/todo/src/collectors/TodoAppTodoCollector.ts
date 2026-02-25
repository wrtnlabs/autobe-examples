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
    user: IEntity;
    session: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
      due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
      is_completed: false,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      user: { connect: { id: props.user.id } },
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
