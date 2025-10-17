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

export async function postCommunityPlatformAdminEscalationLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformEscalationLog.ICreate;
}): Promise<ICommunityPlatformEscalationLog> {
  const now = toISOStringSafe(new Date());
  // Validate report existence
  const report = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: { id: props.body.report_id },
  });
  if (!report) {
    throw new HttpException("Report does not exist", 404);
  }
  // Validate initiator existence
  const initiator = await MyGlobal.prisma.community_platform_members.findFirst({
    where: { id: props.body.initiator_id },
  });
  if (!initiator) {
    throw new HttpException("Initiator does not exist", 404);
  }
  // If destination_admin_id is specified, validate existence
  if (
    props.body.destination_admin_id !== undefined &&
    props.body.destination_admin_id !== null
  ) {
    const targetAdmin =
      await MyGlobal.prisma.community_platform_admins.findFirst({
        where: { id: props.body.destination_admin_id },
      });
    if (!targetAdmin) {
      throw new HttpException("Destination admin does not exist", 404);
    }
  }
  // Generate a UUID for id without 'as'
  const escalationId = v4();
  // Prisma: all Date fields stored as Date, need string conversion on response
  const escalation =
    await MyGlobal.prisma.community_platform_escalation_logs.create({
      data: {
        id: escalationId,
        initiator_id: props.body.initiator_id,
        report_id: props.body.report_id,
        escalation_reason: props.body.escalation_reason,
        destination_admin_id: props.body.destination_admin_id ?? null,
        status: props.body.status,
        resolution_summary: props.body.resolution_summary ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  return {
    id: escalation.id,
    initiator_id: escalation.initiator_id,
    report_id: escalation.report_id,
    escalation_reason: escalation.escalation_reason,
    destination_admin_id: escalation.destination_admin_id ?? null,
    status: escalation.status,
    resolution_summary: escalation.resolution_summary ?? null,
    created_at: toISOStringSafe(escalation.created_at),
    updated_at: toISOStringSafe(escalation.updated_at),
  };
}
