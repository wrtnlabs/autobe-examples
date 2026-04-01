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
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      started_at: props.body.started_at
        ? new Date(props.body.started_at)
        : null,
      due_at: props.body.due_at ? new Date(props.body.due_at) : null,
      completed_at: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.multiUserTodoMembers.id } },
    } satisfies Prisma.multi_user_todo_todosCreateInput;
  }
}
