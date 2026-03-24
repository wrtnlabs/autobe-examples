import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppTodoHistoryEntryCollector {
  export async function collect(props: {
    body: ITodoAppTodoHistoryEntry.ICreate;
    todoAppTodos: IEntity;
  }) {
    const id: string = v4();
    const changedStartDate: Date | null =
      props.body.changedStartDate === undefined ||
      props.body.changedStartDate === null
        ? null
        : new Date(props.body.changedStartDate);
    const changedDueDate: Date | null =
      props.body.changedDueDate === undefined ||
      props.body.changedDueDate === null
        ? null
        : new Date(props.body.changedDueDate);
    return {
      id,
      changed_title: props.body.changedTitle ?? null,
      changed_description: props.body.changedDescription ?? null,
      changed_start_date: changedStartDate,
      changed_due_date: changedDueDate,
      changed_completion_status: props.body.changedCompletionStatus ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      todo: {
        connect: { id: props.todoAppTodos.id },
      },
    } satisfies Prisma.todo_app_todo_history_entriesCreateInput;
  }
}
