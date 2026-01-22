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
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoItemAuditLogTransformer } from "../transformers/TodoAppTodoItemAuditLogTransformer";

export async function getTodoAppUserTodoItemAuditLogsAuditLogId(props: {
  user: UserPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoItemAuditLog> {
  const record = await MyGlobal.prisma.todo_app_todo_item_audit_logs.findUnique(
    {
      where: { id: props.auditLogId },
      ...TodoAppTodoItemAuditLogTransformer.select(),
    },
  );
  if (!record) {
    throw new HttpException("Audit log not found", 404);
  }
  return await TodoAppTodoItemAuditLogTransformer.transform(record);
}
