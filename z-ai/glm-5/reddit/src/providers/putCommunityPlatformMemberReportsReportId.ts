import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberReportsReportId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IUpdate;
}): Promise<ICommunityPlatformReport> {
  // 1. Fetch the report with community info
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        community_id: true,
        status: true,
        community: {
          select: {
            owner_id: true,
          },
        },
      },
    });
  // 2. Authorization check - must be moderator or owner
  const isOwner = report.community.owner_id === props.member.id;
  const moderatorRecord = isOwner
    ? null
    : await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: report.community_id,
          member_id: props.member.id,
          deleted_at: null,
        },
      });
  if (!isOwner && moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate status - can only update pending reports
  if (report.status !== "pending") {
    throw new HttpException("Report already processed", 400);
  }
  // 4. Update report status
  const now = new Date();
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      updated_at: now,
    },
  });
  // 5. If approved, soft-delete the reported content
  if (props.body.status === "approved") {
    // Check for post target
    const postReport =
      await MyGlobal.prisma.community_platform_report_posts.findUnique({
        where: { community_platform_report_id: props.reportId },
      });
    if (postReport !== null) {
      await MyGlobal.prisma.community_platform_posts.update({
        where: { id: postReport.community_platform_post_id },
        data: { deleted_at: now },
      });
    } else {
      // Check for comment target
      const commentReport =
        await MyGlobal.prisma.community_platform_report_comments.findUnique({
          where: { report_id: props.reportId },
        });
      if (commentReport !== null) {
        await MyGlobal.prisma.community_platform_comments.update({
          where: { id: commentReport.comment_id },
          data: { deleted_at: now },
        });
      }
    }
  }
  // 6. Fetch and return updated report
  const updatedReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  return CommunityPlatformReportTransformer.transform(updatedReport);
}
