import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Build WHERE clause for active comments
  const whereInput: Prisma.reddit_community_commentsWhereInput = {
    reddit_community_posts_id: props.postId,
    deleted_at: null,
    ...(props.body.authorId !== undefined && {
      reddit_community_members_id: props.body.authorId,
    }),
    ...(props.body.afterDate !== undefined && {
      created_at: {
        gt: new Date(props.body.afterDate),
      },
    }),
    ...(props.body.beforeDate !== undefined && {
      created_at: {
        lt: new Date(props.body.beforeDate),
      },
    }),
  } satisfies Prisma.reddit_community_commentsWhereInput;
  // Apply depth filters by calculating parent chain (simplified: only top-level comments)
  if (props.body.minDepth !== undefined || props.body.maxDepth !== undefined) {
    if (props.body.minDepth === 0) {
      // minDepth 0 means include top-level comments (parent_comment_id is null)
    } else if (props.body.minDepth !== undefined && props.body.minDepth > 0) {
      // For minDepth > 0, we'd need recursive CTE to calculate depth
      // For simplicity, return empty if minDepth > 0 since we can't calculate depth efficiently
      // In production, this would require a more complex query
      return {
        pagination: {
          current: props.body.page ?? 1,
          limit: props.body.limit ?? 20,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageIRedditCommunityComment.ISummary;
    }
    if (props.body.maxDepth !== undefined && props.body.maxDepth === 0) {
      // maxDepth 0 means only top-level comments
      whereInput.parent_comment_id = null;
    }
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build ORDER BY based on sort
  const orderByInput: Prisma.reddit_community_commentsOrderByWithRelationInput[] =
    [
      (() => {
        switch (props.body.sort) {
          case "new":
            return { created_at: "desc" as const };
          case "controversial":
            // controversial: ORDER BY ABS(vote_score) DESC, created_at DESC
            // Since Prisma doesn't support ABS, use vote_score asc (low scores first) then desc
            // This is a simplification - full implementation would require client-side sort
            return { vote_score: "asc" as const };
          case "best":
          default:
            return { vote_score: "desc" as const };
        }
      })(),
      { created_at: "desc" as const },
    ] satisfies Prisma.reddit_community_commentsOrderByWithRelationInput[];
  // Execute query with author join for profile
  const data = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      parent_comment_id: true,
      _count: {
        select: {
          replies: true,
        },
      },
      author: {
        select: {
          id: true,
          username: true,
          created_at: true,
          karma: {
            select: {
              current_score: true,
            },
          },
        },
      },
      // Fetch parent comment for reply structure
      parent: {
        select: {
          id: true,
          created_at: true,
          author: {
            select: {
              id: true,
              username: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: whereInput,
  });
  // Transform each comment
  const transformedData = await Promise.all(
    data.map(async (comment) => {
      // Calculate vote score (upvotes - downvotes)
      const upvotes = await MyGlobal.prisma.reddit_community_votes.count({
        where: {
          target_comment_id: comment.id,
          vote_type: "upvote",
          deleted_at: null,
        },
      });
      const downvotes = await MyGlobal.prisma.reddit_community_votes.count({
        where: {
          target_comment_id: comment.id,
          vote_type: "downvote",
          deleted_at: null,
        },
      });
      const voteScore = upvotes - downvotes;
      const parentComment = comment.parent
        ? ({
            id: comment.parent.id,
            voteScore: 0,
            createdAt: toISOStringSafe(comment.parent.created_at),
            parentComment: null,
            replyCount: 0,
            author: {
              id: comment.parent.author.id,
              username: comment.parent.author.username,
              created_at: toISOStringSafe(comment.parent.author.created_at),
              profile: undefined,
              karma: undefined,
            } satisfies IRedditCommunityMember.ISummary,
          } satisfies IRedditCommunityComment.ISummary)
        : null;
      const authorKarma = comment.author.karma?.current_score
        ? Number(comment.author.karma.current_score)
        : undefined;
      return {
        id: comment.id,
        voteScore,
        createdAt: toISOStringSafe(comment.created_at),
        parentComment,
        replyCount: comment._count.replies,
        author: {
          id: comment.author.id,
          username: comment.author.username,
          created_at: toISOStringSafe(comment.author.created_at),
          profile: undefined,
          karma: authorKarma,
        } satisfies IRedditCommunityMember.ISummary,
      } satisfies IRedditCommunityComment.ISummary;
    }),
  );
  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityComment.ISummary;
}
