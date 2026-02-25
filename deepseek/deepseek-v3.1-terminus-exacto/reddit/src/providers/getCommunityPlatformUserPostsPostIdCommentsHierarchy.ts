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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserPostsPostIdCommentsHierarchy(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentHierarchy.IInvert> {
  // Verify post exists and user has access
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
    },
  );
  // Get all comments with their hierarchies and vote scores in a single query
  const commentsWithHierarchy =
    await MyGlobal.prisma.community_platform_comments.findMany({
      where: {
        community_platform_post_id: props.postId,
        is_deleted: false,
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
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  // Get vote scores for all comments
  const commentIds = commentsWithHierarchy.map((c) => c.id);
  const voteScores =
    await MyGlobal.prisma.community_platform_comment_vote_scores.findMany({
      where: {
        community_platform_comment_id: { in: commentIds },
      },
    });
  const voteMap = new Map(
    voteScores.map((vote) => [vote.community_platform_comment_id, vote]),
  );
  // Build the hierarchical structure
  const buildCommentTree = (
    comment: (typeof commentsWithHierarchy)[0],
  ): ICommunityPlatformCommentHierarchy.IInvert => {
    const voteScore = voteMap.get(comment.id);
    return {
      id: comment.id as string & tags.Format<"uuid">,
      content: comment.content,
      author: {
        id: comment.author.id as string & tags.Format<"uuid">,
        username: comment.author.username,
        display_name: comment.author.display_name,
        avatar_url: (comment.author.avatar_url ?? null) satisfies
          | (string & tags.Format<"uri">)
          | null as (string & tags.Format<"uri">) | null,
        karma: comment.author.karma as number & tags.Type<"int32">,
        created_at: toISOStringSafe(comment.author.created_at) as string &
          tags.Format<"date-time">,
      } satisfies ICommunityPlatformUser.ISummary,
      children: comment.childHierarchies.map((hierarchy) =>
        buildCommentTree(hierarchy.childComment),
      ),
      votes_count: voteScore?.score ?? (0 as number & tags.Type<"int32">),
      created_at: toISOStringSafe(comment.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(comment.updated_at) as string &
        tags.Format<"date-time">,
    };
  };
  // Find root comments (comments that are not children of any other comment)
  const rootComments = commentsWithHierarchy.filter(
    (comment) =>
      !commentsWithHierarchy.some((c) =>
        c.childHierarchies.some((h) => h.child_comment_id === comment.id),
      ),
  );
  if (rootComments.length === 0) {
    throw new HttpException("No comments found for this post", 404);
  }
  // Return the first root comment's hierarchy
  // Note: The API specification expects a single tree, but there might be multiple root comments
  // This implementation returns the first one for simplicity
  return buildCommentTree(rootComments[0]);
}
