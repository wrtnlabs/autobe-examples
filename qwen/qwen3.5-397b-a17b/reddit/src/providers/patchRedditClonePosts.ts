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

export async function patchRedditClonePosts(props: {
  body: IRedditClonePost.IRequest;
}): Promise<IPageIRedditClonePost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build time filter WHERE clause for top sorting
  const timeFilterWhere = (() => {
    if (props.body.sort !== "top" || !props.body.timeFilter) {
      return {};
    }
    const now = new Date();
    switch (props.body.timeFilter) {
      case "today":
        return {
          created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        };
      case "this_week":
        return {
          created_at: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
      case "this_month":
        return {
          created_at: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        };
      case "this_year":
        return {
          created_at: {
            gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          },
        };
      case "all_time":
      default:
        return {};
    }
  })();
  // Build main WHERE clause
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && { title: { contains: props.body.search } }),
    ...timeFilterWhere,
  } satisfies Prisma.reddit_clone_postsWhereInput;
  // Build ORDER BY clause based on sort type
  const orderByInput = (() => {
    switch (props.body.sort) {
      case "new":
        return { created_at: "desc" as const };
      case "top":
        return { created_at: "desc" as const };
      case "hot":
      case "controversial":
      default:
        return { created_at: "desc" as const };
    }
  })();
  // Query posts with relations
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
  // Get vote scores for each post (UPVOTE = +1, DOWNVOTE = -1)
  const postIds = posts.map((p) => p.id);
  const votes = await MyGlobal.prisma.reddit_clone_votes.findMany({
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
  // Calculate vote scores per post
  const voteScoreMap = new Map<string, number>();
  for (const post of posts) {
    voteScoreMap.set(post.id, 0);
  }
  for (const vote of votes) {
    const current = voteScoreMap.get(vote.target_id) ?? 0;
    const delta =
      vote.vote_type === "UPVOTE" ? 1 : vote.vote_type === "DOWNVOTE" ? -1 : 0;
    voteScoreMap.set(vote.target_id, current + delta);
  }
  // Get comment counts for each post
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
  for (const post of posts) {
    commentCountMap.set(post.id, 0);
  }
  for (const cc of commentCounts) {
    commentCountMap.set(cc.reddit_clone_post_id, cc._count.id);
  }
  // Get karma scores for members
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
    const voteScore = voteScoreMap.get(post.id) ?? 0;
    const commentCount = commentCountMap.get(post.id) ?? 0;
    const karmaScore = karmaScoreMap.get(post.member.id) ?? 0;
    // Build preview based on post type
    const preview = (() => {
      switch (post.post_type) {
        case "TEXT":
          return post.text?.body.substring(0, 200) ?? "";
        case "IMAGE":
          return post.postImage?.file_uri ?? "";
        case "LINK":
          const url = post.link?.url ?? "";
          try {
            const domain = new URL(url).hostname;
            return domain;
          } catch {
            return url;
          }
        default:
          return "";
      }
    })();
    return {
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      post_type: post.post_type,
      author: {
        id: post.member.id as string & tags.Format<"uuid">,
        username: post.member.username,
        display_name: post.member.display_name,
        avatar: post.member.avatar ?? null,
        karma_score: karmaScore,
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
      preview,
    } satisfies IRedditClonePost.ISummary;
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_clone_posts.count({
    where: whereInput,
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditClonePost.ISummary;
}
