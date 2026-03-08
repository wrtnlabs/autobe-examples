import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberReportsReportIdApprove(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformReport> {
  // 1. Load report and verify it exists
  const report =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        status: true,
        post_id: true,
        comment_id: true,
      },
    });
  // 2. Verify report is pending (not already resolved)
  if (report.status !== "pending") {
    throw new HttpException("Report has already been resolved", 409);
  }
  // 3. Determine reported content and find community
  let communityId: string;
  if (report.post_id) {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: report.post_id },
      select: { community_id: true, deleted_at: true },
    });
    if (post.deleted_at !== null) {
      throw new HttpException("Reported post has already been deleted", 404);
    }
    communityId = post.community_id;
  } else if (report.comment_id) {
    const comment =
      await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
        where: { id: report.comment_id },
        select: { reddit_platform_post_id: true, deleted_at: true },
      });
    if (comment.deleted_at !== null) {
      throw new HttpException("Reported comment has already been deleted", 404);
    }
    const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: comment.reddit_platform_post_id },
      select: { community_id: true },
    });
    communityId = post.community_id;
  } else {
    throw new HttpException("Report has no target content", 400);
  }
  // 4. Verify member is owner or moderator of the community
  const isOwner = await MyGlobal.prisma.reddit_platform_communities.findFirst({
    where: {
      id: communityId,
      owner_id: props.member.id,
      deleted_at: null,
    },
  });
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_community_id: communityId,
        reddit_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Not authorized to approve this report", 403);
  }
  // 5. Delete reported content and update report (transaction)
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (report.post_id) {
      // Delete post (cascade deletes comments and votes via Prisma schema)
      await tx.reddit_platform_posts.delete({
        where: { id: report.post_id },
      });
    } else if (report.comment_id) {
      // Delete comment (cascade deletes replies and votes via Prisma schema)
      await tx.reddit_platform_comments.delete({
        where: { id: report.comment_id },
      });
    }
    // Update report status
    await tx.reddit_platform_reports.update({
      where: { id: props.reportId },
      data: {
        status: "approved",
        reviewer_id: props.member.id,
        updated_at: new Date(),
      },
    });
  });
  // 6. Reload and return updated report
  const updatedReport =
    await MyGlobal.prisma.reddit_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...RedditPlatformReportTransformer.select(),
    });
  return await RedditPlatformReportTransformer.transform(updatedReport);
}
