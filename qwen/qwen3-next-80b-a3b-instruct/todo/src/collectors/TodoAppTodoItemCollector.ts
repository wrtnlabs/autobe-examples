import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppTodoItemCollector {
  export async function collect(props: {
    body: ITodoAppTodoItem.ICreate;
    todoAppUsers: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.text,
      description: null,
      status:
        props.body.completed !== undefined && props.body.completed !== null
          ? props.body.completed
            ? "completed"
            : "pending"
          : "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: {
        connect: { id: props.todoAppUsers.id },
      },
    } satisfies Prisma.todo_app_todo_itemsCreateInput;
  }
}
