import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

// Define toISOStringSafe function
function toISOStringSafe(date: Date): string {
  return date.toISOString();
}
export namespace TodoAppTodoCollector {
  export async function collect(props: {
    body: ITodoAppTodo.ICreate;
    todoAppUsers: IEntity;
    todoAppUserSessions: IEntity;
  }) {
    return {
      id: v4(),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      title: (props.body as any).title,
      description: (props.body as any).description ?? null,
      start_date: (props.body as any).startDate
        ? toISOStringSafe(new Date((props.body as any).startDate))
        : null,
      due_date: (props.body as any).dueDate
        ? toISOStringSafe(new Date((props.body as any).dueDate))
        : null,
      is_completed: (props.body as any).isCompleted,
      user: { connect: { id: props.todoAppUsers.id } },
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
