import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneOwnerCommunitiesCommunityId(props: {
  owner: OwnerPayload;
  communityId: string;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  if (community.owner_id !== props.owner.id) {
    throw new HttpException(
      "Forbidden: Only community owner can delete this community",
      403,
    );
  }
  // Get all feed config IDs for this community first
  const feedConfigs = await MyGlobal.prisma.reddit_clone_feed_configs.findMany({
    where: { reddit_clone_communities_id: props.communityId },
    select: { id: true },
  });
  const feedConfigIds = feedConfigs.map((fc) => fc.id);
  // Delete feed views posts and feed views
  if (feedConfigIds.length > 0) {
    await MyGlobal.prisma.reddit_clone_feed_views_posts.deleteMany({
      where: { feedView: { feed_config_id: { in: feedConfigIds } } },
    });
    await MyGlobal.prisma.reddit_clone_feed_views.deleteMany({
      where: { feed_config_id: { in: feedConfigIds } },
    });
  }
  // Delete subscriptions
  await MyGlobal.prisma.reddit_clone_content_subscriptions.deleteMany({
    where: { community_id: props.communityId },
  });
  // Get all post IDs in this community
  const posts = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: { community_id: props.communityId },
    select: { id: true },
  });
  if (posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    // Delete comment-related data
    await MyGlobal.prisma.reddit_clone_content_comment_votes.deleteMany({
      where: { comment: { post_id: { in: postIds } } },
    });
    await MyGlobal.prisma.reddit_clone_content_comments.deleteMany({
      where: { post_id: { in: postIds } },
    });
    // Delete post-related data
    await MyGlobal.prisma.reddit_clone_content_post_votes.deleteMany({
      where: { post_id: { in: postIds } },
    });
    await MyGlobal.prisma.reddit_clone_content_post_links.deleteMany({
      where: { post: { id: { in: postIds } } },
    });
    await MyGlobal.prisma.reddit_clone_content_post_images.deleteMany({
      where: { post: { id: { in: postIds } } },
    });
    await MyGlobal.prisma.reddit_clone_content_post_texts.deleteMany({
      where: { post_id: { in: postIds } },
    });
    // Delete posts
    await MyGlobal.prisma.reddit_clone_content_posts.deleteMany({
      where: { community_id: props.communityId },
    });
  }
  // Delete community-specific data
  await MyGlobal.prisma.reddit_clone_moderator_assignments.deleteMany({
    where: { community_id: props.communityId },
  });
  await MyGlobal.prisma.reddit_clone_community_bans.deleteMany({
    where: { community_id: props.communityId },
  });
  // Get all comments in this community to delete report resolutions
  const postIdsToDelete = posts.map((p) => p.id);
  const comments = await MyGlobal.prisma.reddit_clone_content_comments.findMany(
    {
      where: { post_id: { in: postIdsToDelete } },
      select: { id: true },
    },
  );
  if (comments.length > 0) {
    const commentIds = comments.map((c) => c.id);
    // Delete content report resolutions for these comments
    await MyGlobal.prisma.reddit_clone_content_report_resolutions.deleteMany({
      where: { report: { content_id: { in: commentIds } } },
    });
    // Delete moderation logs
    await MyGlobal.prisma.reddit_clone_moderation_logs.deleteMany({
      where: { comment_id: { in: commentIds } },
    });
  }
  // Delete the community
  await MyGlobal.prisma.reddit_clone_communities.delete({
    where: { id: props.communityId },
  });
}
