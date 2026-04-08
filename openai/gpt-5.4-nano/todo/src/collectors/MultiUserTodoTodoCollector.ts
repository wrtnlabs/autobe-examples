import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoTodoCollector {
  export async function collect(props: { body: IMultiUserTodoTodo.ICreate }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      start_date:
        props.body.startDate != null ? new Date(props.body.startDate) : null,
      due_date:
        props.body.dueDate != null ? new Date(props.body.dueDate) : null,
      is_complete: false,
      lifecycle_state: "normal",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      editHistoryEntries: undefined,
      editHistoryEntriesByOwners: undefined,
    } satisfies Prisma.multi_user_todo_todosCreateInput;
  }
}
