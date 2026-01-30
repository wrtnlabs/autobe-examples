import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoItemAuditLogCollector } from "../collectors/TodoAppTodoItemAuditLogCollector";
import { TodoAppTodoItemAuditLogTransformer } from "../transformers/TodoAppTodoItemAuditLogTransformer";

export async function postTodoAppUserUsersUserIdTodoItemsTodoItemIdAuditLogs(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoItemId: string & tags.Format<"uuid">;
  body: ITodoAppTodoItemAuditLog.ICreate;
}): Promise<ITodoAppTodoItemAuditLog> {
  if (props.userId === undefined || props.todoItemId === undefined) {
    throw new HttpException(
      "UserId and TodoItemId path parameters are required",
      400,
    );
  }
  const createInput = await TodoAppTodoItemAuditLogCollector.collect({
    body: props.body,
    todoAppUsers: { id: props.userId },
    todoAppTodoItems: { id: props.todoItemId },
  });
  const created = await MyGlobal.prisma.todo_app_todo_item_audit_logs.create({
    data: createInput,
  });
  // Fix: Do not change Date fields types, keep them as Date
  const transformedInput = {
    ...created,
    user: { id: props.userId } as {
      id: string & tags.Format<"uuid">;
    },
    todoItem: { id: props.todoItemId } as {
      id: string & tags.Format<"uuid">;
    },
  };
  return await TodoAppTodoItemAuditLogTransformer.transform(transformedInput);
}
