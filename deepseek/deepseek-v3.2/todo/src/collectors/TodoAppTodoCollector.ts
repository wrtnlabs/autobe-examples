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
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relation
      member: { connect: { id: props.member.id } },
      // HasOne and HasMany relations (not applicable for creation)
      trashItem: undefined,
      trashEntry: undefined,
      editHistories: undefined,
      historySnapshots: undefined,
    } satisfies Prisma.todo_app_todosCreateInput;
  }
}
