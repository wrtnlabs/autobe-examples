import { ICommunityPlatformCommentHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentHierarchy";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformModeratorPostsPostIdCommentsHierarchy(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentHierarchy> {
  // Verify post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, community_id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Check moderator access to the community
  const moderatorAccess =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.moderator.id, // Fixed: changed moderator_id to user_id
        community_id: post.community_id,
        deleted_at: null,
      },
    });
  if (!moderatorAccess) {
    throw new HttpException(
      "Moderator does not have access to this community",
      403,
    );
  }
  // Get all comments for this post with their hierarchies
  const commentsWithHierarchies =
    await MyGlobal.prisma.community_platform_comments.findMany({
      where: {
        community_platform_post_id: props.postId,
        deleted_at: null, // Use deleted_at instead of is_deleted
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            karma: true,
            created_at: true,
          },
        },
        childHierarchies: {
          include: {
            childComment: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    avatar_url: true,
                    karma: true,
                    created_at: true,
                  },
                },
                voteScore: {
                  select: { score: true },
                },
              },
            },
          },
          orderBy: { depth: "asc" },
        },
        voteScore: {
          select: { score: true },
        },
      },
      orderBy: { created_at: "asc" },
    });
  if (commentsWithHierarchies.length === 0) {
    throw new HttpException("No comments found for this post", 404);
  }
  // Build comment map
  const commentMap = new Map<string, any>();
  for (const comment of commentsWithHierarchies) {
    const voteScore = comment.voteScore?.score ?? 0;
    commentMap.set(comment.id, {
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        display_name: comment.author.display_name,
        avatar_url: comment.author.avatar_url,
        karma: comment.author.karma,
        created_at: toISOStringSafe(comment.author.created_at),
      } satisfies ICommunityPlatformUser.ISummary,
      voteScore: voteScore,
      createdAt: toISOStringSafe(comment.created_at),
      updatedAt: toISOStringSafe(comment.updated_at),
      deletedAt: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : null,
      children: [],
    });
  }
  // Build parent-child relationships
  for (const comment of commentsWithHierarchies) {
    for (const hierarchy of comment.childHierarchies) {
      const parentNode = commentMap.get(comment.id);
      const childNode = commentMap.get(hierarchy.childComment.id);
      if (parentNode && childNode) {
        parentNode.children.push(childNode);
      }
    }
  }
  // Find root comments (comments that are not children of any other comment in this post)
  const allChildCommentIds = new Set(
    commentsWithHierarchies.flatMap((comment) =>
      comment.childHierarchies.map((h) => h.childComment.id),
    ),
  );
  const rootComments = commentsWithHierarchies
    .filter((comment) => !allChildCommentIds.has(comment.id))
    .map((comment) => commentMap.get(comment.id)!);
  // For hierarchical structure, we need to return a tree
  // Since the endpoint expects a single hierarchy, return the first root comment
  if (rootComments.length === 0) {
    throw new HttpException("No root comments found", 404);
  }
  // Convert to the expected DTO type
  const rootComment = rootComments[0];
  return {
    id: rootComment.id,
    content: rootComment.content,
    author: rootComment.author,
    voteScore: rootComment.voteScore,
    createdAt: rootComment.createdAt,
    updatedAt: rootComment.updatedAt,
    deletedAt: rootComment.deletedAt,
    children: rootComment.children,
  } satisfies ICommunityPlatformCommentHierarchy;
}
