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

export async function patchRedditClonePostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IRequest;
}): Promise<IPageIRedditCloneComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const whereInput: Prisma.reddit_clone_commentsWhereInput = {
    reddit_clone_post_id: props.postId,
    deleted_at: null,
    ...(props.body.date_from && {
      created_at: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to && {
      created_at: {
        lte: new Date(props.body.date_to),
      },
    }),
    ...(props.body.search && {
      body: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.reddit_clone_commentsWhereInput;
  const orderByInput =
    props.body.sort === "best"
      ? { created_at: "desc" as const }
      : props.body.sort === "controversial"
        ? { created_at: "asc" as const }
        : { created_at: "desc" as const };
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
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_clone_membersFindManyArgs,
        post: {
          select: {
            id: true,
            title: true,
            post_type: true,
            member: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar: true,
                created_at: true,
              },
            } satisfies Prisma.reddit_clone_membersFindManyArgs,
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
            } satisfies Prisma.reddit_clone_communitiesFindManyArgs,
            created_at: true,
          },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
        parent: {
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
            } satisfies Prisma.reddit_clone_membersFindManyArgs,
            post: {
              select: {
                id: true,
                title: true,
                post_type: true,
                member: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    avatar: true,
                    created_at: true,
                  },
                } satisfies Prisma.reddit_clone_membersFindManyArgs,
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
                } satisfies Prisma.reddit_clone_communitiesFindManyArgs,
                created_at: true,
              },
            } satisfies Prisma.reddit_clone_postsFindManyArgs,
          },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
      },
    }),
    MyGlobal.prisma.reddit_clone_comments.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(data, async (comment) => {
    const voteAgg = await MyGlobal.prisma.reddit_clone_votes.groupBy({
      by: ["vote_type"],
      where: {
        target_type: "COMMENT",
        target_id: comment.id,
        deleted_at: null,
      },
      _count: { vote_type: true },
    });
    const upvotes =
      voteAgg.find((v) => v.vote_type === "UPVOTE")?._count.vote_type ?? 0;
    const downvotes =
      voteAgg.find((v) => v.vote_type === "DOWNVOTE")?._count.vote_type ?? 0;
    const voteScore = upvotes - downvotes;
    const replyCount = await MyGlobal.prisma.reddit_clone_comments.count({
      where: {
        parent_comment_id: comment.id,
        deleted_at: null,
      },
    });
    const memberKarma = await MyGlobal.prisma.reddit_clone_karma_scores
      .findFirst({
        where: { member_id: comment.member.id },
      })
      .then((k) => k?.score ?? 0);
    const postVoteAgg = await MyGlobal.prisma.reddit_clone_votes.groupBy({
      by: ["vote_type"],
      where: {
        target_type: "POST",
        target_id: comment.post.id,
        deleted_at: null,
      },
      _count: { vote_type: true },
    });
    const postUpvotes =
      postVoteAgg.find((v) => v.vote_type === "UPVOTE")?._count.vote_type ?? 0;
    const postDownvotes =
      postVoteAgg.find((v) => v.vote_type === "DOWNVOTE")?._count.vote_type ??
      0;
    const postVoteScore = postUpvotes - postDownvotes;
    const postCommentCount = await MyGlobal.prisma.reddit_clone_comments.count({
      where: {
        reddit_clone_post_id: comment.post.id,
        deleted_at: null,
      },
    });
    const ownerKarma = await MyGlobal.prisma.reddit_clone_karma_scores
      .findFirst({
        where: { member_id: comment.post.community.owner.id },
      })
      .then((k) => k?.score ?? 0);
    let parentSummary: IRedditCloneComment.ISummary | null = null;
    if (comment.parent) {
      const parentVoteAgg = await MyGlobal.prisma.reddit_clone_votes.groupBy({
        by: ["vote_type"],
        where: {
          target_type: "COMMENT",
          target_id: comment.parent.id,
          deleted_at: null,
        },
        _count: { vote_type: true },
      });
      const parentUpvotes =
        parentVoteAgg.find((v) => v.vote_type === "UPVOTE")?._count.vote_type ??
        0;
      const parentDownvotes =
        parentVoteAgg.find((v) => v.vote_type === "DOWNVOTE")?._count
          .vote_type ?? 0;
      const parentVoteScore = parentUpvotes - parentDownvotes;
      const parentReplyCount =
        await MyGlobal.prisma.reddit_clone_comments.count({
          where: {
            parent_comment_id: comment.parent.id,
            deleted_at: null,
          },
        });
      const parentMemberKarma = await MyGlobal.prisma.reddit_clone_karma_scores
        .findFirst({
          where: { member_id: comment.parent.member.id },
        })
        .then((k) => k?.score ?? 0);
      parentSummary = {
        id: comment.parent.id as string & tags.Format<"uuid">,
        body: comment.parent.body,
        author: {
          id: comment.parent.member.id as string & tags.Format<"uuid">,
          username: comment.parent.member.username,
          display_name: comment.parent.member.display_name,
          avatar: comment.parent.member.avatar ?? null,
          karma_score: parentMemberKarma,
          created_at: toISOStringSafe(comment.parent.member.created_at),
        } satisfies IRedditCloneMember.ISummary,
        post: {
          id: comment.parent.post.id as string & tags.Format<"uuid">,
          title: comment.parent.post.title,
          post_type: comment.parent.post.post_type,
          author: {
            id: comment.parent.post.member.id as string & tags.Format<"uuid">,
            username: comment.parent.post.member.username,
            display_name: comment.parent.post.member.display_name,
            avatar: comment.parent.post.member.avatar ?? null,
            karma_score: 0,
            created_at: toISOStringSafe(comment.parent.post.member.created_at),
          } satisfies IRedditCloneMember.ISummary,
          community: {
            id: comment.parent.post.community.id as string &
              tags.Format<"uuid">,
            name: comment.parent.post.community.name,
            description: comment.parent.post.community.description,
            icon: comment.parent.post.community.icon ?? null,
            subscriber_count: comment.parent.post.community.subscriber_count,
            created_at: toISOStringSafe(
              comment.parent.post.community.created_at,
            ),
            owner: {
              id: comment.parent.post.community.owner.id as string &
                tags.Format<"uuid">,
              username: comment.parent.post.community.owner.username,
              display_name: comment.parent.post.community.owner.display_name,
              avatar: comment.parent.post.community.owner.avatar ?? null,
              karma_score: ownerKarma,
              created_at: toISOStringSafe(
                comment.parent.post.community.owner.created_at,
              ),
            } satisfies IRedditCloneMember.ISummary,
          } satisfies IRedditCloneCommunity.ISummary,
          vote_score: postVoteScore,
          comment_count: postCommentCount,
          created_at: toISOStringSafe(comment.parent.post.created_at),
          preview: "",
        } satisfies IRedditClonePost.ISummary,
        parent: null,
        vote_score: parentVoteScore,
        reply_count: parentReplyCount,
        created_at: toISOStringSafe(comment.parent.created_at),
      } satisfies IRedditCloneComment.ISummary;
    }
    return {
      id: comment.id as string & tags.Format<"uuid">,
      body: comment.body,
      author: {
        id: comment.member.id as string & tags.Format<"uuid">,
        username: comment.member.username,
        display_name: comment.member.display_name,
        avatar: comment.member.avatar ?? null,
        karma_score: memberKarma,
        created_at: toISOStringSafe(comment.member.created_at),
      } satisfies IRedditCloneMember.ISummary,
      post: {
        id: comment.post.id as string & tags.Format<"uuid">,
        title: comment.post.title,
        post_type: comment.post.post_type,
        author: {
          id: comment.post.member.id as string & tags.Format<"uuid">,
          username: comment.post.member.username,
          display_name: comment.post.member.display_name,
          avatar: comment.post.member.avatar ?? null,
          karma_score: 0,
          created_at: toISOStringSafe(comment.post.member.created_at),
        } satisfies IRedditCloneMember.ISummary,
        community: {
          id: comment.post.community.id as string & tags.Format<"uuid">,
          name: comment.post.community.name,
          description: comment.post.community.description,
          icon: comment.post.community.icon ?? null,
          subscriber_count: comment.post.community.subscriber_count,
          created_at: toISOStringSafe(comment.post.community.created_at),
          owner: {
            id: comment.post.community.owner.id as string & tags.Format<"uuid">,
            username: comment.post.community.owner.username,
            display_name: comment.post.community.owner.display_name,
            avatar: comment.post.community.owner.avatar ?? null,
            karma_score: ownerKarma,
            created_at: toISOStringSafe(
              comment.post.community.owner.created_at,
            ),
          } satisfies IRedditCloneMember.ISummary,
        } satisfies IRedditCloneCommunity.ISummary,
        vote_score: postVoteScore,
        comment_count: postCommentCount,
        created_at: toISOStringSafe(comment.post.created_at),
        preview: "",
      } satisfies IRedditClonePost.ISummary,
      parent: parentSummary,
      vote_score: voteScore,
      reply_count: replyCount,
      created_at: toISOStringSafe(comment.created_at),
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
