import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoAppTodoCollector {
  export async function collect(props: {
    body: IMultiUserTodoAppTodo.ICreate;
    multiUserTodoAppMembers: IEntity;
    multiUserTodoAppMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.startDate ?? null,
      due_date: props.body.dueDate ?? null,
      is_completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: {
        connect: {
          id: props.multiUserTodoAppMembers.id,
        },
      },
      editHistories: undefined,
    } satisfies Prisma.multi_user_todo_app_todosCreateInput;
  }
}
