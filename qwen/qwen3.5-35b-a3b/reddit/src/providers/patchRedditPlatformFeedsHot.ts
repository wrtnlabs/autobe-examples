import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformFeedsHot(props: {
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit =
    props.body.limit !== undefined ? Math.min(props.body.limit, 100) : 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        title: { contains: props.body.search, mode: "insensitive" as const },
      }),
    ...(props.body.post_type !== undefined && {
      post_type: props.body.post_type,
    }),
    ...(props.body.community_id !== undefined && {
      reddit_platform_community_id: props.body.community_id,
    }),
    ...(props.body.start_date !== undefined &&
      props.body.start_date !== "" && {
        created_at: {
          gte: new Date(props.body.start_date),
        },
      }),
    ...(props.body.end_date !== undefined &&
      props.body.end_date !== "" && {
        created_at: {
          lte: new Date(props.body.end_date),
        },
      }),
  };
  if (
    props.body.sort_type === "TOP" &&
    props.body.time_range &&
    props.body.time_range !== "ALL"
  ) {
    const now = new Date();
    const startDate = new Date(now);
    switch (props.body.time_range) {
      case "TODAY":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "WEEK":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "MONTH":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "YEAR":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    const startDateIso = toISOStringSafe(startDate);
    if (
      whereConditions.created_at &&
      typeof whereConditions.created_at === "object"
    ) {
      const existingGte = (whereConditions.created_at as any).gte;
      whereConditions.created_at = {
        gte:
          existingGte && new Date(existingGte) > startDate
            ? existingGte
            : startDateIso,
        ...whereConditions.created_at,
      };
    } else {
      whereConditions.created_at = { gte: startDateIso };
    }
  }
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereConditions,
  });
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereConditions,
    include: {
      author: true,
      community: {
        include: {
          owner: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: [
      {
        vote_score: "desc",
      },
      {
        created_at: "desc",
      },
    ],
  });
  const calculateHotScore = (voteScore: number, created_at: Date): number => {
    const upvoteCount = Math.max(voteScore, 0);
    const logVotes = Math.log10(Math.max(upvoteCount, 1));
    const now = new Date();
    const hoursSinceCreated =
      (now.getTime() - created_at.getTime()) / (1000 * 60 * 60);
    const timeDecay = 1.0 / Math.pow(hoursSinceCreated + 1, 0.5);
    return logVotes + timeDecay;
  };
  const data = await Promise.all(
    posts.map(async (post) => {
      const hotScore = calculateHotScore(post.vote_score, post.created_at);
      const authorSummary: IRedditPlatformMember.ISummary = {
        id: post.author.id as string & tags.Format<"uuid">,
        username: post.author.username,
        displayName: post.author.display_name,
        bio: post.author.bio,
        avatarUrl: post.author.avatar_url ?? null,
        karmaScore: post.author.karma_score as number & tags.Type<"int32">,
        createdAt: toISOStringSafe(post.author.created_at) as string &
          tags.Format<"date-time">,
        subscriptionCount: 0 as number & tags.Type<"int32">,
      };
      const ownerSummary: IRedditPlatformMember.ISummary = {
        id: post.community.owner.id as string & tags.Format<"uuid">,
        username: post.community.owner.username,
        displayName: post.community.owner.display_name,
        bio: post.community.owner.bio,
        avatarUrl: post.community.owner.avatar_url ?? null,
        karmaScore: post.community.owner.karma_score as number &
          tags.Type<"int32">,
        createdAt: toISOStringSafe(post.community.owner.created_at) as string &
          tags.Format<"date-time">,
        subscriptionCount: 0 as number & tags.Type<"int32">,
      };
      const communitySummary: IRedditPlatformCommunity.ISummary = {
        id: post.community.id as string & tags.Format<"uuid">,
        name: post.community.name,
        description: post.community.description,
        icon_url: post.community.icon_url,
        subscriber_count: post.community.subscriber_count as number &
          tags.Type<"int32">,
        author: ownerSummary,
        created_at: toISOStringSafe(post.community.created_at) as string &
          tags.Format<"date-time">,
      };
      const postSummary: IRedditPlatformPost.ISummary = {
        id: post.id as string & tags.Format<"uuid">,
        title: post.title,
        post_type: post.post_type,
        vote_score: post.vote_score as number & tags.Type<"int32">,
        comment_count: post.comment_count as number & tags.Type<"int32">,
        author: authorSummary,
        community: communitySummary,
        created_at: toISOStringSafe(post.created_at) as string &
          tags.Format<"date-time">,
        deleted_at:
          post.deleted_at !== null && post.deleted_at !== undefined
            ? toISOStringSafe(post.deleted_at)
            : null,
      };
      return postSummary;
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
