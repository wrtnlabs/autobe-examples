import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReportEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportEscalation";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorReportEscalationsReportEscalationId(props: {
  administrator: AdministratorPayload;
  reportEscalationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportEscalation> {
  const escalation =
    await MyGlobal.prisma.community_platform_report_escalations.findUnique({
      where: { id: props.reportEscalationId },
      include: {
        report: true,
        escalatedToAdministrator: true,
      },
    });

  if (!escalation) {
    throw new HttpException("Escalation not found", 404);
  }

  return {
    id: escalation.id,
    report: {
      id: escalation.report.id,
    },
    escalated_to_administrator: escalation.escalatedToAdministrator
      ? { id: escalation.escalatedToAdministrator.id }
      : undefined,
    escalation_reason: escalation.escalation_reason,
    escalation_status: escalation.escalation_status,
    created_at: toISOStringSafe(escalation.created_at),
    updated_at: toISOStringSafe(escalation.updated_at),
  };
}
