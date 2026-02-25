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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorReportsReportIdDismiss(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const prisma = MyGlobal.prisma;
  // Check if the report exists
  const existingReport = await prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
  });
  if (!existingReport) {
    throw new HttpException("Report not found", 404);
  }
  // Fetch all reported contents related to the report
  const reportedContents =
    await prisma.community_platform_reported_contents.findMany({
      where: { community_platform_report_id: props.reportId },
      select: {
        community_platform_reported_post_id: true,
        community_platform_reported_comment_id: true,
      },
    });
  // Collect unique community IDs related to posts or comments in the report
  const uniqueCommunityIds = new Set<string>();
  // Collect community IDs from posts
  const postIds = reportedContents
    .map((c) => c.community_platform_reported_post_id)
    .filter((id): id is string => id !== null);
  if (postIds.length > 0) {
    const posts = await prisma.community_platform_posts.findMany({
      where: { id: { in: postIds } },
      select: { community_id: true },
    });
    for (const post of posts) {
      uniqueCommunityIds.add(post.community_id);
    }
  }
  // Collect community IDs from comments via posts
  const commentIds = reportedContents
    .map((c) => c.community_platform_reported_comment_id)
    .filter((id): id is string => id !== null);
  if (commentIds.length > 0) {
    const comments = await prisma.community_platform_comments.findMany({
      where: { id: { in: commentIds } },
      select: { post_id: true },
    });
    const postIdsFromComments = comments.map((c) => c.post_id);
    if (postIdsFromComments.length > 0) {
      const posts = await prisma.community_platform_posts.findMany({
        where: { id: { in: postIdsFromComments } },
        select: { community_id: true },
      });
      for (const post of posts) {
        uniqueCommunityIds.add(post.community_id);
      }
    }
  }
  if (uniqueCommunityIds.size === 0) {
    throw new HttpException("No community associated with the report", 404);
  }
  // Check if the moderator manages any of these communities
  const moderatorCommunityCount =
    await prisma.community_platform_community_moderators.count({
      where: {
        community_id: { in: Array.from(uniqueCommunityIds) },
        community_moderator_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (moderatorCommunityCount === 0) {
    throw new HttpException("Forbidden", 403);
  }
  const currentTimestamp = toISOStringSafe(new Date());
  // Transactionally update the report status to 'dismissed' and log the dismissal
  const updatedReport = await prisma.$transaction(async (tx) => {
    const updated = await tx.community_platform_reports.update({
      where: { id: props.reportId },
      data: {
        status: "dismissed",
        updated_at: currentTimestamp,
      },
      ...CommunityPlatformReportTransformer.select(),
    });
    await tx.community_platform_moderation_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: props.moderator.id,
        report_id: props.reportId,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
        deleted_at: null,
      },
    });
    return updated;
  });
  return await CommunityPlatformReportTransformer.transform(updatedReport);
}
