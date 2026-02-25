import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminReportsReportIdApprove(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      reportReason: {
        select: {
          id: true,
          reason_text: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      reportedContents: {
        select: {
          id: true,
          community_platform_reported_post_id: true,
          community_platform_reported_comment_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      decisions: {
        select: {
          id: true,
          report_id: true,
          moderator_id: true,
          decision: true,
          comments: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.status !== "pending") {
    throw new HttpException("Report is not pending approval", 409);
  }
  const reportedContent = report.reportedContents[0];
  if (!reportedContent) {
    throw new HttpException("Report has no reported contents", 400);
  }
  let communityId: string | undefined;
  if (reportedContent.community_platform_reported_post_id) {
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: reportedContent.community_platform_reported_post_id },
      select: { community_id: true },
    });
    if (!post) {
      throw new HttpException("Reported post not found", 404);
    }
    communityId = post.community_id;
  } else if (reportedContent.community_platform_reported_comment_id) {
    const comment =
      await MyGlobal.prisma.community_platform_post_comments.findUnique({
        where: { id: reportedContent.community_platform_reported_comment_id },
        select: { post_id: true },
      });
    if (!comment) {
      throw new HttpException("Reported comment not found", 404);
    }
    const post = await MyGlobal.prisma.community_platform_posts.findUnique({
      where: { id: comment.post_id },
      select: { community_id: true },
    });
    if (!post) {
      throw new HttpException("Post of reported comment not found", 404);
    }
    communityId = post.community_id;
  } else {
    throw new HttpException("Reported content must be a post or comment", 400);
  }
  const isModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: communityId,
        community_moderator_id: props.admin.id,
        deleted_at: null,
      },
    });
  if (!isModerator) {
    throw new HttpException("Forbidden: Admin is not community moderator", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (reportedContent.community_platform_reported_post_id) {
      await tx.community_platform_posts.delete({
        where: { id: reportedContent.community_platform_reported_post_id },
      });
    } else if (reportedContent.community_platform_reported_comment_id) {
      await tx.community_platform_post_comments.delete({
        where: { id: reportedContent.community_platform_reported_comment_id },
      });
    }
    await tx.community_platform_reports_decisions.create({
      data: {
        id: v4(),
        report_id: report.id,
        moderator_id: props.admin.id,
        decision: "approved",
        comments: null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
    await tx.community_platform_reports.update({
      where: { id: report.id },
      data: {
        status: "approved",
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
  const updatedReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(updatedReport);
}
