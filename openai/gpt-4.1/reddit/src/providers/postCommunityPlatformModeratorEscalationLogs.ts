import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorEscalationLogs(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformEscalationLog.ICreate;
}): Promise<ICommunityPlatformEscalationLog> {
  if (props.body.initiator_id !== props.moderator.id) {
    throw new HttpException(
      "Unauthorized: initiator_id does not match moderator",
      403,
    );
  }

  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.body.report_id },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  if (
    props.body.destination_admin_id !== undefined &&
    props.body.destination_admin_id !== null
  ) {
    const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
      where: { id: props.body.destination_admin_id },
    });
    if (!admin) {
      throw new HttpException("Destination admin not found", 404);
    }
  }

  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_escalation_logs.create({
      data: {
        id: v4(),
        initiator_id: props.body.initiator_id,
        report_id: props.body.report_id,
        escalation_reason: props.body.escalation_reason,
        destination_admin_id:
          props.body.destination_admin_id !== undefined
            ? props.body.destination_admin_id
            : null,
        status: props.body.status,
        resolution_summary:
          props.body.resolution_summary !== undefined
            ? props.body.resolution_summary
            : null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    initiator_id: created.initiator_id,
    destination_admin_id: created.destination_admin_id ?? null,
    report_id: created.report_id,
    escalation_reason: created.escalation_reason,
    status: created.status,
    resolution_summary: created.resolution_summary ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
