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
import { CommunityReportResolutionTransformer } from "../transformers/CommunityReportResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string;
  body: ICommunityReport.IApprove;
}): Promise<ICommunityReportResolution> {
  // Find report with PENDING status
  const report = await MyGlobal.prisma.community_reports.findUniqueOrThrow({
    where: {
      id: props.reportId,
      status: "PENDING",
    },
    select: {
      id: true,
      community_id: true,
      content_type: true,
      content_id: true,
    },
  });
  // Verify moderator authorization
  const moderator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: report.community_id,
      member_id: props.member.id,
    },
  });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  const resolutionId = v4();
  // Execute all operations in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create resolution record
    await tx.community_report_resolutions.create({
      data: {
        id: resolutionId,
        community_report_id: report.id,
        moderator_id: props.member.id,
        action: "APPROVE",
        notes: props.body.notes ?? null,
        created_at: now,
      },
    });
    // Update report status
    await tx.community_reports.update({
      where: { id: report.id },
      data: {
        status: "APPROVED",
        updated_at: now,
      },
    });
    // Delete content based on type
    if (report.content_type === "POST") {
      await tx.community_posts.delete({
        where: { id: report.content_id },
      });
    } else {
      await tx.community_comments.delete({
        where: { id: report.content_id },
      });
    }
  });
  // Fetch the resolution with transformer select
  const resolution =
    await MyGlobal.prisma.community_report_resolutions.findUniqueOrThrow({
      where: { id: resolutionId },
      ...CommunityReportResolutionTransformer.select(),
    });
  return await CommunityReportResolutionTransformer.transform(resolution);
}
