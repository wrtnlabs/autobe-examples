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

export async function getCommunityPlatformModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...CommunityPlatformReportTransformer.select(),
    });
  if (props.moderator.type !== ("admin" as string)) {
    // Collect all community IDs from reported contents using correct snake_case properties
    const postIds = report.reportedContents
      .filter(
        (c) =>
          c.community_platform_reported_post_id !== null &&
          c.community_platform_reported_post_id !== undefined,
      )
      .map((c) => c.community_platform_reported_post_id!) as string[];
    const commentIds = report.reportedContents
      .filter(
        (c) =>
          c.community_platform_reported_comment_id !== null &&
          c.community_platform_reported_comment_id !== undefined,
      )
      .map((c) => c.community_platform_reported_comment_id!) as string[];
    // Fetch communities for posts using community_id property
    const posts =
      postIds.length > 0
        ? await MyGlobal.prisma.community_platform_posts.findMany({
            where: { id: { in: postIds } },
            select: { community_id: true },
          })
        : [];
    // Fetch communities for comments by getting post_ids from comments then community_ids from posts
    const commentsPostsCommunityIds: string[] = [];
    if (commentIds.length > 0) {
      const commentPosts =
        await MyGlobal.prisma.community_platform_post_comments.findMany({
          where: { id: { in: commentIds } },
          select: { post_id: true },
        });
      if (commentPosts.length > 0) {
        const postIdsFromComments = commentPosts.map((cp) => cp.post_id);
        const commentPostsPosts =
          await MyGlobal.prisma.community_platform_posts.findMany({
            where: { id: { in: postIdsFromComments } },
            select: { community_id: true },
          });
        commentPostsPosts.forEach((p) => {
          if (p.community_id) commentsPostsCommunityIds.push(p.community_id);
        });
      }
    }
    // Combine community IDs
    const communityIds = new Set<string>();
    posts.forEach((p) => {
      if (p.community_id) communityIds.add(p.community_id);
    });
    commentsPostsCommunityIds.forEach((cid) => {
      communityIds.add(cid);
    });
    if (communityIds.size === 0) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if moderator belongs to any community
    const moderatorMembership =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: { in: Array.from(communityIds) },
          community_moderator_id: props.moderator.id,
          deleted_at: null,
        },
      });
    if (!moderatorMembership) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await CommunityPlatformReportTransformer.transform(report);
}
