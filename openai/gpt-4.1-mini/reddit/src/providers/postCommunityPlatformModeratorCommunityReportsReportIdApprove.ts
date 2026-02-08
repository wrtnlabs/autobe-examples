import { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunityReportsReportIdApprove(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportDecision> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      community_platform_user_id: true,
      community_platform_report_reason_id: true,
      description: true,
    },
  });
  if (!report || report.status !== "active") {
    throw new HttpException("Report not found or inactive", 404);
  }
  const isMod =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        id: props.moderator.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!isMod) {
    throw new HttpException("Unauthorized", 403);
  }
  const existingDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.findFirst({
      where: { report_id: props.reportId },
      select: { id: true },
    });
  if (existingDecision) {
    throw new HttpException("Report already decided", 409);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const createdDecision =
    await MyGlobal.prisma.community_platform_reports_decisions.create({
      data: {
        id: v4(),
        report_id: props.reportId,
        moderator_id: props.moderator.id,
        decision: "approved",
        comments: null,
        created_at: now,
        updated_at: now,
      },
      select: {
        id: true,
        report_id: true,
        decision: true,
        comments: true,
        created_at: true,
        updated_at: true,
      },
    });
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: { status: "approved" },
  });
  return createdDecision;
}
