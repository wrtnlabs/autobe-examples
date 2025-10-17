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

export async function putCommunityPlatformAdminEscalationLogsEscalationLogId(props: {
  admin: AdminPayload;
  escalationLogId: string & tags.Format<"uuid">;
  body: ICommunityPlatformEscalationLog.IUpdate;
}): Promise<ICommunityPlatformEscalationLog> {
  const { escalationLogId, body } = props;
  // 1. Find escalation log, or throw 404
  const escalationLog =
    await MyGlobal.prisma.community_platform_escalation_logs.findUnique({
      where: { id: escalationLogId },
    });
  if (!escalationLog) {
    throw new HttpException("Escalation log not found", 404);
  }

  // 2. Prepare update fields: only what's defined + updated_at
  const now = toISOStringSafe(new Date());
  const update: {
    destination_admin_id?: string | null;
    status?: string;
    resolution_summary?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: now,
  };
  if (body.destination_admin_id !== undefined) {
    update.destination_admin_id = body.destination_admin_id;
  }
  if (body.status !== undefined) {
    update.status = body.status;
  }
  if (body.resolution_summary !== undefined) {
    update.resolution_summary = body.resolution_summary;
  }

  // 3. Update record
  const updated =
    await MyGlobal.prisma.community_platform_escalation_logs.update({
      where: { id: escalationLogId },
      data: update,
    });

  // 4. Return full object using only valid fields, convert Date(s)
  return {
    id: updated.id,
    initiator_id: updated.initiator_id,
    destination_admin_id: updated.destination_admin_id ?? undefined,
    report_id: updated.report_id,
    escalation_reason: updated.escalation_reason,
    status: updated.status,
    resolution_summary: updated.resolution_summary ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
