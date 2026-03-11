import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { IMultiUserTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAuditLog";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { MultiUserTodoAuditLogTransformer } from "../transformers/MultiUserTodoAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoAuditLog> {
  // Query the audit log by ID with transformer selection
  const auditLog =
    await MyGlobal.prisma.multi_user_todo_audit_logs.findUniqueOrThrow({
      where: { id: props.auditLogId },
      ...MultiUserTodoAuditLogTransformer.select(),
    });
  // Transform the database result to DTO format
  return await MultiUserTodoAuditLogTransformer.transform(auditLog);
}
