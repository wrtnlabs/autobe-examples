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

export async function patchRedditCommunityMemberComments(props: {
  member: MemberPayload;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "best";
  // Build where clause from filters
  const whereClause: Prisma.reddit_community_commentsWhereInput = {
    deleted_at: null,
    ...(props.body.authorId && {
      reddit_community_members_id: props.body.authorId,
    }),
    ...(props.body.postId && {
      reddit_community_posts_id: props.body.postId,
    }),
    ...(props.body.afterDate && {
      created_at: { gt: new Date(props.body.afterDate) },
    }),
    ...(props.body.beforeDate && {
      created_at: { lt: new Date(props.body.beforeDate) },
    }),
  };
  const orderByClause: Prisma.reddit_community_commentsOrderByWithRelationInput[] =
    sort === "new"
      ? [{ created_at: "desc" }]
      : sort === "controversial"
        ? [{ created_at: "desc" }]
        : [{ created_at: "desc" }];
  const comments = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByClause,
    select: {
      id: true,
      created_at: true,
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
    },
  });
  const commentIds = comments.map((c) => c.id);
  const votes =
    await MyGlobal.prisma.reddit_community_vote_of_comments.findMany({
      where: {
        comment_id: { in: commentIds },
      },
      select: {
        id: true,
        comment_id: true,
        vote_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  const voteScoreMap = new Map<string, number>();
  for (const vote of votes) {
    const current = voteScoreMap.get(vote.comment_id) ?? 0;
    voteScoreMap.set(
      vote.comment_id,
      current + (vote.vote_id === "up" ? 1 : -1),
    );
  }
  const parentComments = new Map<string, IRedditCommunityComment.ISummary>();
  for (const comment of comments) {
    if (comment.parent_comment_id) {
      const parentId = comment.parent_comment_id;
      if (!parentComments.has(parentId)) {
        const parentComment = comments.find((c) => c.id === parentId);
        if (parentComment) {
          parentComments.set(parentId, {
            id: parentComment.id as string & tags.Format<"uuid">,
            voteScore: voteScoreMap.get(parentId) ?? 0,
            createdAt: toISOStringSafe(parentComment.created_at),
            parentComment: null,
            replyCount: parentComment._count.replies,
            author: {
              id: parentComment.author.id as string & tags.Format<"uuid">,
              username: parentComment.author.username,
              created_at: toISOStringSafe(parentComment.author.created_at),
              profile: undefined,
              karma: parentComment.author.karma?.current_score,
            } satisfies IRedditCommunityMember.ISummary,
          });
        }
      }
    }
  }
  const transformedData = await ArrayUtil.asyncMap(
    comments,
    async (comment) => {
      const parentComment = comment.parent_comment_id
        ? (parentComments.get(comment.parent_comment_id) ?? null)
        : null;
      return {
        id: comment.id as string & tags.Format<"uuid">,
        voteScore: voteScoreMap.get(comment.id) ?? 0,
        createdAt: toISOStringSafe(comment.created_at),
        parentComment,
        replyCount: comment._count.replies,
        author: {
          id: comment.author.id as string & tags.Format<"uuid">,
          username: comment.author.username,
          created_at: toISOStringSafe(comment.author.created_at),
          profile: undefined,
          karma: comment.author.karma?.current_score,
        } satisfies IRedditCommunityMember.ISummary,
      } satisfies IRedditCommunityComment.ISummary;
    },
  );
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: whereClause,
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
