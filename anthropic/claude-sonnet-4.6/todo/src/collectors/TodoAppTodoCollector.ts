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
    todoAppMembers: IEntity; // from authorized actor
    todoAppMemberSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      is_completed: false,
      started_at: props.body.started_at
        ? new Date(props.body.started_at)
        : null,
      due_at: props.body.due_at ? new Date(props.body.due_at) : null,
      trashed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.todoAppMembers.id } },
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
