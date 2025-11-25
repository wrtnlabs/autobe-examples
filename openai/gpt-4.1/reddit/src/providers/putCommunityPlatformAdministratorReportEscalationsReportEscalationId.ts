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

export async function putCommunityPlatformAdministratorReportEscalationsReportEscalationId(props: {
  administrator: AdministratorPayload;
  reportEscalationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportEscalation.IUpdate;
}): Promise<ICommunityPlatformReportEscalation> {
  // 1. Fetch escalation record
  const escalation =
    await MyGlobal.prisma.community_platform_report_escalations.findUnique({
      where: { id: props.reportEscalationId },
    });
  if (!escalation) {
    throw new HttpException("Report escalation not found.", 404);
  }

  // 2. Validate escalated_to_administrator_id if provided (even if null for explicit unassignment)
  let validatedEscalatedToAdministratorId = undefined;
  if ("escalated_to_administrator_id" in props.body) {
    if (
      props.body.escalated_to_administrator_id !== undefined &&
      props.body.escalated_to_administrator_id !== null
    ) {
      // Verify administrator exists, is not deleted, is active
      const admin =
        await MyGlobal.prisma.community_platform_administrators.findFirst({
          where: {
            id: props.body.escalated_to_administrator_id,
            deleted_at: null,
            status: "active",
          },
        });
      if (!admin) {
        throw new HttpException(
          "Assigned administrator does not exist or is not active.",
          400,
        );
      }
      validatedEscalatedToAdministratorId =
        props.body.escalated_to_administrator_id;
    } else if (props.body.escalated_to_administrator_id === null) {
      // Explicit unassignment allowed
      validatedEscalatedToAdministratorId = null;
    }
  }

  // 3. Build update data (only set fields present in body, also always update updated_at)
  const updateData: { [key: string]: unknown } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (
    "escalation_reason" in props.body &&
    props.body.escalation_reason !== undefined
  ) {
    updateData["escalation_reason"] = props.body.escalation_reason;
  }
  if (
    "escalation_status" in props.body &&
    props.body.escalation_status !== undefined
  ) {
    updateData["escalation_status"] = props.body.escalation_status;
  }
  if ("escalated_to_administrator_id" in props.body) {
    updateData["escalated_to_administrator_id"] =
      validatedEscalatedToAdministratorId;
  }

  // 4. Perform update
  const updated =
    await MyGlobal.prisma.community_platform_report_escalations.update({
      where: { id: props.reportEscalationId },
      data: updateData,
    });

  // 5. Fetch referenced report for summary
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: updated.report_id },
  });
  if (!report) {
    throw new HttpException("Linked report not found.", 500);
  }

  // 6. Fetch referenced administrator summary (if not null)
  let escalatedToAdministratorSummary = undefined;
  if (
    updated.escalated_to_administrator_id !== null &&
    updated.escalated_to_administrator_id !== undefined
  ) {
    const admin =
      await MyGlobal.prisma.community_platform_administrators.findUnique({
        where: {
          id: updated.escalated_to_administrator_id,
          deleted_at: null,
          status: "active",
        },
      });
    if (admin) {
      escalatedToAdministratorSummary = { id: admin.id };
    } else {
      escalatedToAdministratorSummary = null;
    }
  } else if (updated.escalated_to_administrator_id === null) {
    escalatedToAdministratorSummary = null;
  } else {
    escalatedToAdministratorSummary = undefined;
  }

  // 7. Return full DTO
  return {
    id: updated.id,
    report: { id: report.id },
    escalated_to_administrator: escalatedToAdministratorSummary,
    escalation_reason: updated.escalation_reason,
    escalation_status: updated.escalation_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
