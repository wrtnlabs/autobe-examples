import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the post exists and get its community
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_id: true,
        deleted_at: true,
      },
    },
  );
  // Check if post is already deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post already deleted", 404);
  }
  // Verify moderator has permission in this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: post.community_id,
        deleted_at: null,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException(
      "Moderator does not have permission to delete posts in this community",
      403,
    );
  }
  try {
    // Perform cascade deletion in transaction
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Get all comments for this post
      const comments = await tx.community_platform_comments.findMany({
        where: { community_platform_post_id: props.postId },
        select: { id: true },
      });
      const commentIds = comments.map((comment) => comment.id);
      if (commentIds.length > 0) {
        // Delete comment vote karma impacts
        await tx.community_platform_vote_karma_impact_of_comments.deleteMany({
          where: {
            community_platform_comment_vote_id: {
              in: await tx.community_platform_comment_votes
                .findMany({
                  where: { comment_id: { in: commentIds } },
                  select: { id: true },
                })
                .then((votes) => votes.map((v) => v.id)),
            },
          },
        });
        // Delete comment votes
        await tx.community_platform_comment_votes.deleteMany({
          where: { comment_id: { in: commentIds } },
        });
        // Delete comments
        await tx.community_platform_comments.deleteMany({
          where: { id: { in: commentIds } },
        });
      }
      // Delete post vote karma impacts
      await tx.community_platform_vote_karma_impact_of_posts.deleteMany({
        where: {
          community_platform_post_vote_id: {
            in: await tx.community_platform_post_votes
              .findMany({
                where: { post_id: props.postId },
                select: { id: true },
              })
              .then((votes) => votes.map((v) => v.id)),
          },
        },
      });
      // Delete post votes
      await tx.community_platform_post_votes.deleteMany({
        where: { post_id: props.postId },
      });
      // Finally delete the post
      await tx.community_platform_posts.delete({
        where: { id: props.postId },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException("Failed to delete post", 500);
    }
    throw error;
  }
}
