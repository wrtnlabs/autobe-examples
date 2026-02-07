import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAuditLog";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAuditLogTransformer } from "../transformers/TodoAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAuditLogsAuditLogId(props: {
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ITodoAuditLog> {
  const auditLog = await MyGlobal.prisma.todo_audit_logs.findUnique({
    where: { id: props.auditLogId },
    ...TodoAuditLogTransformer.select(),
  });
  if (!auditLog) {
    throw new HttpException("Audit log not found", 404);
  }
  return await TodoAuditLogTransformer.transform(auditLog);
}
