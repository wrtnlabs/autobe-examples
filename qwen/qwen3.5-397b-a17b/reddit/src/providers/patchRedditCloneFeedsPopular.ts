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

export async function patchRedditCloneFeedsPopular(props: {
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timeFilter = props.body.timeFilter;
  const search = props.body.search;
  // Build time filter WHERE clause for 'top' sort
  const getTimeFilter = (): Date | null => {
    if (sort !== "top" || !timeFilter || timeFilter === "all_time") {
      return null;
    }
    const now = new Date();
    switch (timeFilter) {
      case "today":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "this_week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "this_month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "this_year":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };
  const timeFilterDate = getTimeFilter();
  // Build WHERE clause
  const whereInput: Prisma.reddit_clone_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
    },
    member: {
      deleted_at: null,
    },
    ...(search && {
      title: {
        contains: search,
        mode: "insensitive",
      },
    }),
    ...(timeFilterDate && {
      created_at: {
        gte: timeFilterDate,
      },
    }),
  } satisfies Prisma.reddit_clone_postsWhereInput;
  // Build ORDER BY clause
  const orderByInput =
    sort === "new"
      ? { created_at: "desc" as const }
      : { created_at: "desc" as const };
  // Query posts with joins
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
      },
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
      text: {
        select: {
          body: true,
        },
      },
      link: {
        select: {
          url: true,
        },
      },
      postImage: {
        select: {
          file_uri: true,
        },
      },
    },
  });
  // Get vote scores for all posts
  const postIds = posts.map((p) => p.id);
  const voteScores = await MyGlobal.prisma.reddit_clone_votes.findMany({
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
  const voteScoreMap = new Map<string, number>();
  for (const postId of postIds) {
    const votes = voteScores.filter((v) => v.target_id === postId);
    const score = votes.reduce((acc, v) => {
      return (
        acc +
        (v.vote_type === "UPVOTE" ? 1 : v.vote_type === "DOWNVOTE" ? -1 : 0)
      );
    }, 0);
    voteScoreMap.set(postId, score);
  }
  // Get comment counts for all posts
  const commentCounts = await MyGlobal.prisma.reddit_clone_comments.groupBy({
    by: ["reddit_clone_post_id"],
    where: {
      reddit_clone_post_id: { in: postIds },
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });
  const commentCountMap = new Map<string, number>();
  for (const agg of commentCounts) {
    commentCountMap.set(agg.reddit_clone_post_id, agg._count.id);
  }
  // Get karma scores for all members
  const memberIds = posts.map((p) => p.member.id);
  const karmaScores = await MyGlobal.prisma.reddit_clone_karma_scores.findMany({
    where: {
      member_id: { in: memberIds },
    },
    select: {
      member_id: true,
      score: true,
    },
  });
  const karmaScoreMap = new Map<string, number>();
  for (const ks of karmaScores) {
    karmaScoreMap.set(ks.member_id, ks.score);
  }
  // Transform to DTO format
  const data = await ArrayUtil.asyncMap(posts, async (post) => {
    // Build preview based on post_type
    let preview = "";
    if (post.post_type === "TEXT" && post.text) {
      preview = post.text.body.slice(0, 200);
    } else if (post.post_type === "IMAGE" && post.postImage) {
      preview = post.postImage.file_uri;
    } else if (post.post_type === "LINK" && post.link) {
      try {
        const urlObj = new URL(post.link.url);
        preview = urlObj.hostname;
      } catch {
        preview = post.link.url;
      }
    }
    const authorKarma = karmaScoreMap.get(post.member.id) ?? 0;
    return {
      id: post.id,
      title: post.title,
      post_type: post.post_type,
      author: {
        id: post.member.id,
        username: post.member.username,
        display_name: post.member.display_name,
        avatar:
          post.member.avatar === null
            ? null
            : post.member.avatar === undefined
              ? null
              : post.member.avatar,
        karma_score: authorKarma,
        created_at: toISOStringSafe(post.member.created_at),
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        icon:
          post.community.icon === null
            ? null
            : post.community.icon === undefined
              ? null
              : post.community.icon,
        subscriber_count: post.community.subscriber_count,
        created_at: toISOStringSafe(post.community.created_at),
        owner: {
          id: post.community.owner.id,
          username: post.community.owner.username,
          display_name: post.community.owner.display_name,
          avatar:
            post.community.owner.avatar === null
              ? null
              : post.community.owner.avatar === undefined
                ? null
                : post.community.owner.avatar,
          karma_score: 0,
          created_at: toISOStringSafe(post.community.owner.created_at),
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
      vote_score: voteScoreMap.get(post.id) ?? 0,
      comment_count: commentCountMap.get(post.id) ?? 0,
      created_at: toISOStringSafe(post.created_at),
      preview,
    } satisfies IRedditClonePost.ISummary;
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditClonePost.ISummary;
}
