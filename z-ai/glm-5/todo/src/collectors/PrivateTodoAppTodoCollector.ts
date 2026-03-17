import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace PrivateTodoAppTodoCollector {
  export async function collect(props: {
    body: IPrivateTodoAppTodo.ICreate;
    privateTodoAppMembers: IEntity;
    privateTodoAppMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.privateTodoAppMembers.id } },
      editHistories: undefined,
    } satisfies Prisma.private_todo_app_todosCreateInput;
  }
}
