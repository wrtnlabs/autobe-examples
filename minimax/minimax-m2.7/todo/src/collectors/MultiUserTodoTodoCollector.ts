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
      // Scalar fields
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? "",
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
      due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation (required FK)
      member: { connect: { id: props.multiUserTodoMembers.id } },
      // HasMany relations
      // editHistories: Reverse relation - cannot create from parent side, excluded
    } satisfies Prisma.multi_user_todo_todosCreateInput;
  }
}
