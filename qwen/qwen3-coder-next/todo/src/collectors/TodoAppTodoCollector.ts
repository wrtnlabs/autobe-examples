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
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
      due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
      is_complete: false,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.todoAppUsers.id } },
      historyEntries: undefined,
      sortingIndex: undefined,
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
