import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_community_post_id: props.postId,
    deleted_at: null,
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.reddit_community_commentsWhereInput;
  const sort = props.body.sort ?? "new";
  const orderByInput = (
    sort === "best"
      ? { created_at: "desc" as const }
      : sort === "new"
        ? { created_at: "desc" as const }
        : { created_at: "asc" as const }
  ) satisfies Prisma.reddit_community_commentsOrderByWithRelationInput;
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
        parentComment: {
          select: {
            id: true,
            content: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member: {
              select: {
                id: true,
                username: true,
                created_at: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: whereInput,
    }),
  ]);
  const commentIds = comments.map((c) => c.id);
  const parentCommentIds = comments
    .filter((c) => c.parentComment !== null)
    .map((c) => c.parentComment!.id);
  const allCommentIds = [...new Set([...commentIds, ...parentCommentIds])];
  const votes =
    allCommentIds.length > 0
      ? await MyGlobal.prisma.reddit_community_comment_votes.findMany({
          where: {
            reddit_community_comment_id: { in: allCommentIds },
          },
          select: {
            reddit_community_comment_id: true,
            direction: true,
          },
        })
      : [];
  const voteScores: Record<string, number> = {};
  for (const commentId of allCommentIds) {
    const commentVotes = votes.filter(
      (v) => v.reddit_community_comment_id === commentId,
    );
    const upvotes = commentVotes.filter((v) => v.direction === "UPVOTE").length;
    const downvotes = commentVotes.filter(
      (v) => v.direction === "DOWNVOTE",
    ).length;
    voteScores[commentId] = upvotes - downvotes;
  }
  const data = comments.map(
    (comment) =>
      ({
        id: comment.id as string & tags.Format<"uuid">,
        content: comment.content,
        author: {
          id: comment.member.id as string & tags.Format<"uuid">,
          username: comment.member.username,
          created_at: toISOStringSafe(comment.member.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IRedditCommunityMember.ISummary,
        parent: comment.parentComment
          ? ({
              id: comment.parentComment.id as string & tags.Format<"uuid">,
              content: comment.parentComment.content,
              author: {
                id: comment.parentComment.member.id as string &
                  tags.Format<"uuid">,
                username: comment.parentComment.member.username,
                created_at: toISOStringSafe(
                  comment.parentComment.member.created_at,
                ) as string & tags.Format<"date-time">,
              } satisfies IRedditCommunityMember.ISummary,
              created_at: toISOStringSafe(
                comment.parentComment.created_at,
              ) as string & tags.Format<"date-time">,
              updated_at: toISOStringSafe(
                comment.parentComment.updated_at,
              ) as string & tags.Format<"date-time">,
              deleted_at: comment.parentComment.deleted_at
                ? (toISOStringSafe(comment.parentComment.deleted_at) as string &
                    tags.Format<"date-time">)
                : null,
              vote_score: voteScores[comment.parentComment.id] ?? 0,
            } satisfies IRedditCommunityComment.ISummary)
          : null,
        vote_score: voteScores[comment.id] ?? 0,
        created_at: toISOStringSafe(comment.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(comment.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at: comment.deleted_at
          ? (toISOStringSafe(comment.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      }) satisfies IRedditCommunityComment.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityComment.ISummary;
}
