import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminEscalationLogsEscalationLogId(props: {
  admin: AdminPayload;
  escalationLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformEscalationLog> {
  const record =
    await MyGlobal.prisma.community_platform_escalation_logs.findUnique({
      where: { id: props.escalationLogId },
    });
  if (!record) throw new HttpException("Escalation log not found", 404);
  return {
    id: record.id,
    initiator_id: record.initiator_id,
    destination_admin_id: record.destination_admin_id ?? undefined,
    report_id: record.report_id,
    escalation_reason: record.escalation_reason,
    status: record.status,
    resolution_summary: record.resolution_summary ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
