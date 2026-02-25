import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { RedditCommunityReportTransformer } from "../transformers/RedditCommunityReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunityModeratorReportsReportId(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string;
}): Promise<IRedditCommunityCommunity> {
  const select = RedditCommunityReportTransformer.select();
  const report =
    await MyGlobal.prisma.reddit_community_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      ...select,
    });
  // Extract target entity ID using the correct relation property names (not field names)
  // From transformer: postReport: reddit_community_posts | null, commentReport: reddit_community_comments | null
  const postId = report.postReport?.id;
  const commentId = report.commentReport?.id;
  // Determine target community_id accordingly
  let targetCommunityId: string | null = null;
  if (postId) {
    const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
      {
        where: { id: postId },
        select: { community_id: true },
      },
    );
    targetCommunityId = post.community_id;
  } else if (commentId) {
    const comment =
      await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
        where: { id: commentId },
        select: { post_id: true },
      });
    const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow(
      {
        where: { id: comment.post_id },
        select: { community_id: true },
      },
    );
    targetCommunityId = post.community_id;
  }
  if (!targetCommunityId) {
    throw new HttpException("Report target is invalid or missing", 400);
  }
  // Authorization: Check if communityModerator moderates the target community
  // From schema: reddit_community_moderators has fields: user_id, community_id
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        community_id: targetCommunityId,
        user_id: props.communityModerator.id,
      },
    },
  );
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Return the target community object using the loaded transformer
  return await RedditCommunityCommunityTransformer.transform(
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: targetCommunityId },
      ...RedditCommunityCommunityTransformer.select(),
    }),
  );
}
