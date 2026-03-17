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
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      started_at: props.body.started_at
        ? new Date(props.body.started_at)
        : null,
      due_at: props.body.due_at ? new Date(props.body.due_at) : null,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.todoAppMembers.id } },
      editHistories: undefined,
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
