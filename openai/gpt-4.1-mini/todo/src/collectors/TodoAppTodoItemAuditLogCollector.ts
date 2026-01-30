import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppTodoItemAuditLogCollector {
  export async function collect(props: {
    body: ITodoAppTodoItemAuditLog.ICreate;
    todoAppUsers: IEntity; // from path parameter userId
    todoAppTodoItems: IEntity; // from path parameter todoItemId
  }) {
    return {
      id: v4(),
      action: props.body.action,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      todoItem: {
        connect: { id: props.todoAppTodoItems.id },
      },
      user: {
        connect: { id: props.todoAppUsers.id },
      },
    } satisfies Prisma.todo_app_todo_item_audit_logsCreateInput;
  }
}
