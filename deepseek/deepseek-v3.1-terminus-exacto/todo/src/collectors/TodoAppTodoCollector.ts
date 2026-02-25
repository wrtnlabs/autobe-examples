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
    todoAppUsers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      user: { connect: { id: props.todoAppUsers.id } },
      // HasMany relations (optional)
      completions: undefined,
      descriptionField: undefined,
      startDateField: undefined,
      dueDateField: undefined,
      histories: undefined,
      historySnapshotItems: undefined,
      trashItems: undefined,
      permanentDeletions: undefined,
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
