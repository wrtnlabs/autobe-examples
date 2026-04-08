import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoTodoCollector {
  export async function collect(props: {
    body: IMultiUserTodoTodo.ICreate;
    multiUserTodoMembers: IEntity;
  }) {
    return {
      id: crypto.randomUUID(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      is_complete: false,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      member: {
        connect: {
          id: props.multiUserTodoMembers.id,
        },
      },
    } satisfies Prisma.multi_user_todo_todosCreateInput;
  }
}
