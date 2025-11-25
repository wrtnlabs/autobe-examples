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

export async function postCommunityPlatformAdministratorReportEscalations(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformReportEscalation.ICreate;
}): Promise<ICommunityPlatformReportEscalation> {
  // Check that the referenced report exists and is not deleted
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.body.report_id },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (!report || report.deleted_at !== null) {
    throw new HttpException(
      "Referenced report does not exist or was deleted.",
      404,
    );
  }

  // If administrator assignment is present, check that admin exists/active/not deleted
  let escalatedAdminSummary:
    | ICommunityPlatformAdministrator.ISummary
    | null
    | undefined = undefined;
  if (
    Object.prototype.hasOwnProperty.call(
      props.body,
      "escalated_to_administrator_id",
    ) &&
    props.body.escalated_to_administrator_id !== null &&
    props.body.escalated_to_administrator_id !== undefined
  ) {
    const adminRecord =
      await MyGlobal.prisma.community_platform_administrators.findUnique({
        where: {
          id: props.body.escalated_to_administrator_id,
        },
        select: {
          id: true,
          deleted_at: true,
          status: true,
        },
      });
    if (
      !adminRecord ||
      adminRecord.deleted_at !== null ||
      adminRecord.status !== "active"
    ) {
      throw new HttpException(
        "Escalated administrator assignment is invalid or inactive.",
        400,
      );
    }
    escalatedAdminSummary = { id: adminRecord.id };
  }

  // Create the escalation UUID and timestamps
  const escalationId = v4();
  const nowIso = toISOStringSafe(new Date());

  // Insert, enforcing unique-per-report constraint
  let createdEscalation;
  try {
    createdEscalation =
      await MyGlobal.prisma.community_platform_report_escalations.create({
        data: {
          id: escalationId,
          report_id: props.body.report_id,
          escalation_reason: props.body.escalation_reason,
          escalation_status: props.body.escalation_status,
          escalated_to_administrator_id: Object.prototype.hasOwnProperty.call(
            props.body,
            "escalated_to_administrator_id",
          )
            ? props.body.escalated_to_administrator_id
            : null,
          created_at: nowIso,
          updated_at: nowIso,
        },
      });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new HttpException(
        "An escalation already exists for this report.",
        409,
      );
    }
    throw new HttpException("Failed to escalate report. Contact admin.", 500);
  }

  // Build and return full DTO
  return {
    id: createdEscalation.id,
    report: { id: createdEscalation.report_id },
    escalated_to_administrator: escalatedAdminSummary ?? null,
    escalation_reason: createdEscalation.escalation_reason,
    escalation_status: createdEscalation.escalation_status,
    created_at: toISOStringSafe(createdEscalation.created_at),
    updated_at: toISOStringSafe(createdEscalation.updated_at),
  };
}
