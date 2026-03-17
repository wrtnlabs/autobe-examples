import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMembersMemberIdComments(props: {
  memberId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "new";
  const whereInput: Prisma.reddit_clone_commentsWhereInput = {
    reddit_clone_member_id: props.memberId,
    deleted_at: null,
    ...(props.body.date_from && {
      created_at: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to && {
      created_at: {
        ...(props.body.date_from && { gte: new Date(props.body.date_from) }),
        lte: new Date(props.body.date_to),
      },
    }),
    ...(props.body.search && {
      body: { contains: props.body.search, mode: "insensitive" },
    }),
  } satisfies Prisma.reddit_clone_commentsWhereInput;
  const orderByInput = (() => {
    if (sort === "best") {
      return { created_at: "desc" } as const;
    } else if (sort === "controversial") {
      return { created_at: "desc" } as const;
    }
    return { created_at: "desc" } as const;
  })() satisfies Prisma.reddit_clone_commentsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_comments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        body: true,
        created_at: true,
        parent_comment_id: true,
        reddit_clone_post_id: true,
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar: true,
            created_at: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            created_at: true,
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                subscriber_count: true,
                created_at: true,
                owner: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    avatar: true,
                    created_at: true,
                  },
                },
              },
            },
            member: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar: true,
                created_at: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_clone_comments.count({
      where: whereInput,
    }),
  ]);
  const commentIds = data.map((c) => c.id);
  const voteData = await MyGlobal.prisma.reddit_clone_votes.findMany({
    where: {
      target_type: "COMMENT",
      target_id: { in: commentIds },
      deleted_at: null,
    },
    select: {
      target_id: true,
      vote_type: true,
    },
  });
  const voteScoreMap = new Map<string, number>();
  for (const commentId of commentIds) {
    const votes = voteData.filter((v) => v.target_id === commentId);
    const score = votes.reduce((acc, v) => {
      return (
        acc +
        (v.vote_type === "UPVOTE" ? 1 : v.vote_type === "DOWNVOTE" ? -1 : 0)
      );
    }, 0);
    voteScoreMap.set(commentId, score);
  }
  const replyData = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: {
      parent_comment_id: { in: commentIds },
      deleted_at: null,
    },
    select: {
      parent_comment_id: true,
    },
  });
  const replyCountMap = new Map<string, number>();
  for (const commentId of commentIds) {
    const count = replyData.filter(
      (r) => r.parent_comment_id === commentId,
    ).length;
    replyCountMap.set(commentId, count);
  }
  const postCommentCountMap = new Map<string, number>();
  const postIds = [...new Set(data.map((c) => c.reddit_clone_post_id))];
  const postCommentData = await MyGlobal.prisma.reddit_clone_comments.findMany({
    where: {
      reddit_clone_post_id: { in: postIds },
      deleted_at: null,
    },
    select: {
      reddit_clone_post_id: true,
    },
  });
  for (const postId of postIds) {
    const count = postCommentData.filter(
      (c) => c.reddit_clone_post_id === postId,
    ).length;
    postCommentCountMap.set(postId, count);
  }
  const postVoteData = await MyGlobal.prisma.reddit_clone_votes.findMany({
    where: {
      target_type: "POST",
      target_id: { in: postIds },
      deleted_at: null,
    },
    select: {
      target_id: true,
      vote_type: true,
    },
  });
  const postVoteScoreMap = new Map<string, number>();
  for (const postId of postIds) {
    const votes = postVoteData.filter((v) => v.target_id === postId);
    const score = votes.reduce((acc, v) => {
      return (
        acc +
        (v.vote_type === "UPVOTE" ? 1 : v.vote_type === "DOWNVOTE" ? -1 : 0)
      );
    }, 0);
    postVoteScoreMap.set(postId, score);
  }
  const memberKarmaData =
    await MyGlobal.prisma.reddit_clone_karma_scores.findMany({
      where: {
        member_id: {
          in: [...new Set(data.map((c) => c.member.id))],
        },
      },
      select: {
        member_id: true,
        score: true,
      },
    });
  const memberKarmaMap = new Map<string, number>();
  for (const kd of memberKarmaData) {
    memberKarmaMap.set(kd.member_id, kd.score);
  }
  const transformedData = await ArrayUtil.asyncMap(data, async (comment) => {
    const parent = comment.parent_comment_id
      ? await MyGlobal.prisma.reddit_clone_comments.findUnique({
          where: { id: comment.parent_comment_id },
          select: {
            id: true,
            body: true,
            created_at: true,
            member: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar: true,
                created_at: true,
              },
            },
          },
        })
      : null;
    const parentKarma = parent
      ? (memberKarmaMap.get(parent.member.id) ?? 0)
      : 0;
    return {
      id: comment.id as string & tags.Format<"uuid">,
      body: comment.body,
      author: {
        id: comment.member.id as string & tags.Format<"uuid">,
        username: comment.member.username,
        display_name: comment.member.display_name,
        avatar: comment.member.avatar ?? null,
        karma_score: memberKarmaMap.get(comment.member.id) ?? 0,
        created_at: toISOStringSafe(comment.member.created_at) as string &
          tags.Format<"date-time">,
      } satisfies IRedditCloneMember.ISummary,
      post: {
        id: comment.post.id as string & tags.Format<"uuid">,
        title: comment.post.title,
        post_type: comment.post.post_type,
        community: {
          id: comment.post.community.id as string & tags.Format<"uuid">,
          name: comment.post.community.name,
          description: comment.post.community.description,
          icon: comment.post.community.icon ?? null,
          subscriber_count: comment.post.community.subscriber_count,
          created_at: toISOStringSafe(
            comment.post.community.created_at,
          ) as string & tags.Format<"date-time">,
          owner: {
            id: comment.post.community.owner.id as string & tags.Format<"uuid">,
            username: comment.post.community.owner.username,
            display_name: comment.post.community.owner.display_name,
            avatar: comment.post.community.owner.avatar ?? null,
            karma_score:
              memberKarmaMap.get(comment.post.community.owner.id) ?? 0,
            created_at: toISOStringSafe(
              comment.post.community.owner.created_at,
            ) as string & tags.Format<"date-time">,
          } satisfies IRedditCloneMember.ISummary,
        } satisfies IRedditCloneCommunity.ISummary,
        author: {
          id: comment.post.member.id as string & tags.Format<"uuid">,
          username: comment.post.member.username,
          display_name: comment.post.member.display_name,
          avatar: comment.post.member.avatar ?? null,
          karma_score: memberKarmaMap.get(comment.post.member.id) ?? 0,
          created_at: toISOStringSafe(
            comment.post.member.created_at,
          ) as string & tags.Format<"date-time">,
        } satisfies IRedditCloneMember.ISummary,
        vote_score: postVoteScoreMap.get(comment.post.id) ?? 0,
        comment_count: postCommentCountMap.get(comment.post.id) ?? 0,
        created_at: toISOStringSafe(comment.post.created_at) as string &
          tags.Format<"date-time">,
        preview: "",
      } satisfies IRedditClonePost.ISummary,
      parent: parent
        ? ({
            id: parent.id as string & tags.Format<"uuid">,
            body: parent.body,
            author: {
              id: parent.member.id as string & tags.Format<"uuid">,
              username: parent.member.username,
              display_name: parent.member.display_name,
              avatar: parent.member.avatar ?? null,
              karma_score: parentKarma,
              created_at: toISOStringSafe(parent.member.created_at) as string &
                tags.Format<"date-time">,
            } satisfies IRedditCloneMember.ISummary,
            post: {
              id: comment.post.id as string & tags.Format<"uuid">,
              title: comment.post.title,
              post_type: comment.post.post_type,
              community: {
                id: comment.post.community.id as string & tags.Format<"uuid">,
                name: comment.post.community.name,
                description: comment.post.community.description,
                icon: comment.post.community.icon ?? null,
                subscriber_count: comment.post.community.subscriber_count,
                created_at: toISOStringSafe(
                  comment.post.community.created_at,
                ) as string & tags.Format<"date-time">,
                owner: {
                  id: comment.post.community.owner.id as string &
                    tags.Format<"uuid">,
                  username: comment.post.community.owner.username,
                  display_name: comment.post.community.owner.display_name,
                  avatar: comment.post.community.owner.avatar ?? null,
                  karma_score:
                    memberKarmaMap.get(comment.post.community.owner.id) ?? 0,
                  created_at: toISOStringSafe(
                    comment.post.community.owner.created_at,
                  ) as string & tags.Format<"date-time">,
                } satisfies IRedditCloneMember.ISummary,
              } satisfies IRedditCloneCommunity.ISummary,
              author: {
                id: comment.post.member.id as string & tags.Format<"uuid">,
                username: comment.post.member.username,
                display_name: comment.post.member.display_name,
                avatar: comment.post.member.avatar ?? null,
                karma_score: memberKarmaMap.get(comment.post.member.id) ?? 0,
                created_at: toISOStringSafe(
                  comment.post.member.created_at,
                ) as string & tags.Format<"date-time">,
              } satisfies IRedditCloneMember.ISummary,
              vote_score: postVoteScoreMap.get(comment.post.id) ?? 0,
              comment_count: postCommentCountMap.get(comment.post.id) ?? 0,
              created_at: toISOStringSafe(comment.post.created_at) as string &
                tags.Format<"date-time">,
              preview: "",
            } satisfies IRedditClonePost.ISummary,
            parent: null,
            vote_score: voteScoreMap.get(parent.id) ?? 0,
            reply_count: replyCountMap.get(parent.id) ?? 0,
            created_at: toISOStringSafe(parent.created_at) as string &
              tags.Format<"date-time">,
          } satisfies IRedditCloneComment.ISummary)
        : null,
      vote_score: voteScoreMap.get(comment.id) ?? 0,
      reply_count: replyCountMap.get(comment.id) ?? 0,
      created_at: toISOStringSafe(comment.created_at) as string &
        tags.Format<"date-time">,
    } satisfies IRedditCloneComment.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCloneComment.ISummary;
}
