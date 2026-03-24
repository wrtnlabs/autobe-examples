import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppTodoSnapshotCollector {
  export async function collect(props: {
    body: ITodoAppTodoSnapshot.ICreate;
    todoAppTodos: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      start_date:
        props.body.start_date !== null ? new Date(props.body.start_date) : null,
      due_date:
        props.body.due_date !== null ? new Date(props.body.due_date) : null,
      completion_status: props.body.completion_status ? "true" : "false",
      lifecycle_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      todo: {
        connect: { id: props.todoAppTodos.id },
      },
    } satisfies Prisma.todo_app_todo_snapshotsCreateInput;
  }
}
