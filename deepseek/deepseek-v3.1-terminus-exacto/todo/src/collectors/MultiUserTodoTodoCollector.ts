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
    multiUserTodoMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.startDate ? new Date(props.body.startDate) : null,
      due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
      is_completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.multiUserTodoMembers.id } },
      // Has relations (not applicable for creation)
      trashEntry: undefined,
      snapshots: undefined,
      viewStats: undefined,
      completionStatuses: undefined,
      editHistories: undefined,
      editHistorySnapshots: undefined,
    } satisfies Prisma.multi_user_todo_todosCreateInput;
  }
}
