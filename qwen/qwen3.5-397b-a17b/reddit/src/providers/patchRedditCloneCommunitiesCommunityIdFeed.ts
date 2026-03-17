import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
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

export async function patchRedditCloneCommunitiesCommunityIdFeed(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "new";
  const timeFilter = props.body.timeFilter;
  const search = props.body.search;
  const now = new Date();
  const getTimeAgo = (days: number): Date => {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  };
  const timeFilterWhere: Prisma.reddit_clone_postsWhereInput = {};
  if (sort === "top" && timeFilter) {
    if (timeFilter === "today") {
      timeFilterWhere.created_at = { gte: getTimeAgo(1) };
    } else if (timeFilter === "this_week") {
      timeFilterWhere.created_at = { gte: getTimeAgo(7) };
    } else if (timeFilter === "this_month") {
      timeFilterWhere.created_at = { gte: getTimeAgo(30) };
    } else if (timeFilter === "this_year") {
      timeFilterWhere.created_at = { gte: getTimeAgo(365) };
    }
  }
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(search && {
      title: {
        contains: search,
        mode: "insensitive",
      },
    }),
    ...timeFilterWhere,
  } satisfies Prisma.reddit_clone_postsWhereInput;
  const orderByInput: Prisma.reddit_clone_postsOrderByWithRelationInput =
    (() => {
      switch (sort) {
        case "hot":
          return { created_at: "desc" };
        case "new":
          return { created_at: "desc" };
        case "top":
          return { created_at: "desc" };
        case "controversial":
          return { created_at: "desc" };
        default:
          return { created_at: "desc" };
      }
    })() satisfies Prisma.reddit_clone_postsOrderByWithRelationInput;
  const posts = await MyGlobal.prisma.reddit_clone_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      post_type: true,
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
          } satisfies Prisma.reddit_clone_membersFindManyArgs,
        },
      } satisfies Prisma.reddit_clone_communitiesFindManyArgs,
      text: {
        select: {
          body: true,
        },
      } satisfies Prisma.reddit_clone_post_textsFindManyArgs,
      link: {
        select: {
          url: true,
        },
      } satisfies Prisma.reddit_clone_post_linksFindManyArgs,
      postImage: {
        select: {
          file_uri: true,
        },
      } satisfies Prisma.reddit_clone_post_imagesFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(posts, async (post) => {
    const voteScoreResult = await MyGlobal.prisma.reddit_clone_votes.groupBy({
      by: ["vote_type"],
      where: {
        target_type: "POST",
        target_id: post.id,
        deleted_at: null,
      },
      _count: {
        vote_type: true,
      },
    });
    let voteScore = 0;
    for (const result of voteScoreResult) {
      if (result.vote_type === "UPVOTE") {
        voteScore += result._count.vote_type;
      } else if (result.vote_type === "DOWNVOTE") {
        voteScore -= result._count.vote_type;
      }
    }
    const commentCount = await MyGlobal.prisma.reddit_clone_comments.count({
      where: {
        reddit_clone_post_id: post.id,
        deleted_at: null,
      },
    });
    let preview = "";
    if (post.post_type === "TEXT" && post.text) {
      preview = post.text.body.substring(0, 200);
    } else if (post.post_type === "IMAGE" && post.postImage) {
      preview = post.postImage.file_uri;
    } else if (post.post_type === "LINK" && post.link) {
      try {
        const url = new URL(post.link.url);
        preview = url.hostname;
      } catch {
        preview = post.link.url;
      }
    }
    const authorKarma =
      await MyGlobal.prisma.reddit_clone_karma_scores.findFirst({
        where: {
          member_id: post.member.id,
        },
        select: {
          score: true,
        },
      });
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      post_type: post.post_type,
      author: {
        id: post.member.id as string & tags.Format<"uuid">,
        username: post.member.username,
        display_name: post.member.display_name,
        avatar: post.member.avatar ?? null,
        karma_score: authorKarma?.score ?? 0,
        created_at: toISOStringSafe(post.member.created_at),
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: post.community.id as string & tags.Format<"uuid">,
        name: post.community.name,
        description: post.community.description,
        icon: post.community.icon ?? null,
        subscriber_count: post.community.subscriber_count,
        created_at: toISOStringSafe(post.community.created_at),
        owner: {
          id: post.community.owner.id as string & tags.Format<"uuid">,
          username: post.community.owner.username,
          display_name: post.community.owner.display_name,
          avatar: post.community.owner.avatar ?? null,
          karma_score: 0,
          created_at: toISOStringSafe(post.community.owner.created_at),
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
      vote_score: voteScore,
      comment_count: commentCount,
      created_at: toISOStringSafe(post.created_at),
      preview: preview,
    } satisfies IRedditClonePost.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditClonePost.ISummary;
}
