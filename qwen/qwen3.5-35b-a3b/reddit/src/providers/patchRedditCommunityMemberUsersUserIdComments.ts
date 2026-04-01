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

export async function patchRedditCommunityMemberUsersUserIdComments(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "best";
  // Build where clause
  const whereInput = {
    reddit_community_members_id: props.userId,
    deleted_at: null,
    ...(props.body.authorId && {
      reddit_community_members_id: props.body.authorId,
    }),
    ...(props.body.postId && { reddit_community_posts_id: props.body.postId }),
    ...(props.body.communityId && {
      post: { community_id: props.body.communityId },
    }),
    ...(props.body.afterDate && {
      created_at: { gt: props.body.afterDate },
    }),
    ...(props.body.beforeDate && {
      created_at: { lt: props.body.beforeDate },
    }),
  } satisfies Prisma.reddit_community_commentsWhereInput;
  // Determine orderBy
  const orderByInput =
    sort === "best"
      ? [{ created_at: "desc" as const }]
      : sort === "new"
        ? [{ created_at: "desc" as const }]
        : sort === "controversial"
          ? [{ created_at: "desc" as const }]
          : [{ created_at: "desc" as const }];
  // Query comments with author, post, and votes aggregation
  const [commentsData, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            created_at: true,
            deleted_at: true,
            karma: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            author_id: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: whereInput,
    }),
  ]);
  // Aggregate vote scores for each comment
  const voteScores =
    await MyGlobal.prisma.reddit_community_vote_of_comments.groupBy({
      by: ["comment_id"],
      _count: true,
    });
  // Create a map of comment_id to vote count
  const voteScoreMap = new Map<string, number>();
  for (const vote of voteScores) {
    const votes = await MyGlobal.prisma.reddit_community_votes.findMany({
      where: {
        id: vote.comment_id,
      },
      select: {
        vote_type: true,
      },
    });
    voteScoreMap.set(vote.comment_id, votes.length);
  }
  // Transform to response format
  const transformedData = await ArrayUtil.asyncMap(
    commentsData,
    async (comment) => {
      // Calculate vote score from votes
      const commentVotes =
        await MyGlobal.prisma.reddit_community_votes.findMany({
          where: {
            target_comment_id: comment.id,
            deleted_at: null,
          },
          select: { vote_type: true },
        });
      const voteScore = commentVotes.reduce((acc, vote) => {
        return vote.vote_type === "upvote" ? acc + 1 : acc - 1;
      }, 0);
      // Get parent comment if exists
      const parentComment = comment.parent_comment_id
        ? await MyGlobal.prisma.reddit_community_comments.findUnique({
            where: { id: comment.parent_comment_id },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  created_at: true,
                  deleted_at: true,
                  karma: true,
                },
              },
            },
          })
        : null;
      // Get reply count
      const replyCount = await MyGlobal.prisma.reddit_community_comments.count({
        where: {
          parent_comment_id: comment.id,
          deleted_at: null,
        },
      });
      return {
        id: comment.id,
        voteScore: voteScore,
        createdAt: toISOStringSafe(comment.created_at),
        parentComment: parentComment
          ? {
              id: parentComment.id,
              voteScore: 0,
              createdAt: toISOStringSafe(parentComment.created_at),
              parentComment: null,
              replyCount: 0,
              author: {
                id: parentComment.author.id,
                username: parentComment.author.username,
                created_at: toISOStringSafe(parentComment.author.created_at),
                profile: undefined,
              },
            }
          : null,
        replyCount: replyCount,
        author: {
          id: comment.author.id,
          username: comment.author.username,
          created_at: toISOStringSafe(comment.author.created_at),
          profile: undefined,
        },
      } satisfies IRedditCommunityComment.ISummary;
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityComment.ISummary;
}
