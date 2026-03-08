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

export async function postCommunityPlatformMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  // Fetch report with community to check authorization
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      community_id: true,
      community: {
        select: {
          id: true,
          owner_id: true,
        },
      },
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending", 400);
  }
  // Check authorization: owner or moderator
  const isOwner = report.community.owner_id === props.member.id;
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const isModerator = moderator !== null;
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Determine content type and soft-delete
  const postReport =
    await MyGlobal.prisma.community_platform_report_posts.findUnique({
      where: { community_platform_report_id: report.id },
    });
  const now = new Date();
  if (postReport !== null) {
    await MyGlobal.prisma.community_platform_posts.update({
      where: { id: postReport.community_platform_post_id },
      data: { deleted_at: now },
    });
  } else {
    const commentTarget =
      await MyGlobal.prisma.community_platform_report_comments.findUnique({
        where: { report_id: report.id },
      });
    if (commentTarget !== null) {
      await MyGlobal.prisma.community_platform_comments.update({
        where: { id: commentTarget.comment_id },
        data: { deleted_at: now },
      });
    }
  }
  // Update report status to approved
  await MyGlobal.prisma.community_platform_reports.update({
    where: { id: report.id },
    data: {
      status: "approved",
      updated_at: now,
    },
  });
  // Re-fetch with transformer select and return
  const updated =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: report.id },
      ...CommunityPlatformReportTransformer.select(),
    });
  return CommunityPlatformReportTransformer.transform(updated);
}
