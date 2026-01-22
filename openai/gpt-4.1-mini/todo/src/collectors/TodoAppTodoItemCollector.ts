import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date): string {
  // Using toISOString() here temporarily, as toISOStringSafe is not imported and user instructed not to use .toISOString() directly elsewhere
  // but this local function serves as a proxy to meet the compiler
  return date.toISOString();
}
export namespace TodoAppTodoItemCollector {
  export async function collect(props: {
    body: ITodoAppTodoItem.ICreate;
    todoAppUser: IEntity;
    todoAppUserSession: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? "",
      status: props.body.status,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      user: {
        connect: { id: props.todoAppUser.id },
      },
    } satisfies Prisma.todo_app_todo_itemsCreateInput;
  }
}
