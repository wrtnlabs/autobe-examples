import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityReportTransformer } from "../transformers/CommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberReportsReportIdDismiss(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityReport.IDismiss;
}): Promise<ICommunityReport> {
  // Fetch the report with community relation
  const report = await MyGlobal.prisma.community_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      community_id: true,
      status: true,
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  // Verify report is PENDING
  if (report.status !== "PENDING") {
    throw new HttpException("Report already resolved", 400);
  }
  // Check if member is a moderator of the community
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: report.community_id,
      member_id: props.member.id,
    },
  });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Create resolution and update report status atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_report_resolutions.create({
      data: {
        id: v4(),
        community_report_id: props.reportId,
        moderator_id: props.member.id,
        action: "DISMISS",
        notes: props.body.notes ?? null,
        created_at: new Date(),
      },
    }),
    MyGlobal.prisma.community_reports.update({
      where: { id: props.reportId },
      data: {
        status: "DISMISSED",
        updated_at: new Date(),
      },
    }),
  ]);
  // Fetch and return the updated report with resolution
  const updatedReport =
    await MyGlobal.prisma.community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityReportTransformer.select(),
    });
  return await CommunityReportTransformer.transform(updatedReport);
}
