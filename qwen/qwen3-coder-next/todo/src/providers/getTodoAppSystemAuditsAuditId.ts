import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSystemAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemAudit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppSystemAuditsAuditId(props: {
  auditId: string;
}): Promise<ITodoAppSystemAudit> {
  const audit = await MyGlobal.prisma.todo_app_system_audits.findUnique({
    where: { id: props.auditId },
  });
  if (!audit) {
    throw new HttpException("Audit not found", 404);
  }
  return {
    id: audit.id as string & tags.Format<"uuid">,
    todo_app_user_id:
      audit.todo_app_user_id === null
        ? undefined
        : (audit.todo_app_user_id as string & tags.Format<"uuid">),
    event_type: audit.event_type,
    ip_address: audit.ip_address,
    user_agent: audit.user_agent === null ? undefined : audit.user_agent,
    event_metadata:
      audit.event_metadata === null ? undefined : audit.event_metadata,
    created_at: toISOStringSafe(audit.created_at) as string &
      tags.Format<"date-time">,
  };
}
