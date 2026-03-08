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

export async function patchRedditPlatformPosts(props: {
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
  };
  if (props.body.search) {
    whereInput.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.post_type) {
    whereInput.post_type = props.body.post_type;
  }
  if (props.body.community_id) {
    whereInput.reddit_platform_community_id = props.body.community_id;
  }
  let created_atFilter:
    | Prisma.DateTimeFilter<"reddit_platform_posts">
    | undefined;
  if (props.body.start_date) {
    const startDate = new Date(props.body.start_date);
    created_atFilter = {
      gte: startDate,
    };
  }
  if (props.body.end_date) {
    const endDate = new Date(props.body.end_date);
    if (created_atFilter) {
      created_atFilter = {
        gte: created_atFilter.gte,
        lte: endDate,
      };
    } else {
      created_atFilter = {
        lte: endDate,
      };
    }
  }
  if (created_atFilter) {
    whereInput.created_at = created_atFilter;
  }
  let orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput;
  switch (props.body.sort_type) {
    case "NEW":
      orderByInput = { created_at: "desc" };
      break;
    case "TOP": {
      const now = new Date();
      const timeStart = new Date(now);
      if (props.body.time_range === "TODAY") {
        timeStart.setHours(0, 0, 0, 0);
      } else if (props.body.time_range === "WEEK") {
        timeStart.setDate(timeStart.getDate() - 7);
      } else if (props.body.time_range === "MONTH") {
        timeStart.setMonth(timeStart.getMonth() - 1);
      } else if (props.body.time_range === "YEAR") {
        timeStart.setFullYear(timeStart.getFullYear() - 1);
      }
      if (created_atFilter) {
        created_atFilter = {
          gte: timeStart,
          lte: created_atFilter.lte,
        };
      } else {
        created_atFilter = {
          gte: timeStart,
        };
      }
      whereInput.created_at = created_atFilter;
      orderByInput = { vote_score: "desc" };
      break;
    }
    case "HOT":
      orderByInput = { vote_score: "desc" };
      break;
    case "CONTROVERSIAL":
      orderByInput = { vote_score: "desc" };
      break;
    default:
      orderByInput = { created_at: "desc" };
  }
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma_score: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          owner_id: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  const transformedData = await Promise.all(
    data.map(async (post) => {
      const authorSummary: IRedditPlatformMember.ISummary = {
        id: post.author.id,
        username: post.author.username,
        displayName: post.author.display_name,
        bio: post.author.bio,
        avatarUrl: post.author.avatar_url,
        karmaScore: post.author.karma_score,
        createdAt: toISOStringSafe(post.author.created_at),
        subscriptionCount:
          await MyGlobal.prisma.reddit_platform_community_subscriptions.count({
            where: { reddit_platform_member_id: post.author.id },
          }),
      };
      const communityOwner: IRedditPlatformMember.ISummary = {
        id: post.community.owner_id,
        username: "",
        displayName: "",
        bio: null,
        avatarUrl: null,
        karmaScore: 0,
        createdAt: "",
        subscriptionCount: 0,
      };
      const communitySummary: IRedditPlatformCommunity.ISummary = {
        id: post.community.id,
        name: post.community.name,
        description: post.community.description,
        icon_url: post.community.icon_url,
        subscriber_count: post.community.subscriber_count,
        author: communityOwner,
        created_at: toISOStringSafe(post.community.created_at),
      };
      return {
        id: post.id,
        title: post.title,
        post_type: post.post_type,
        vote_score: post.vote_score,
        comment_count: post.comment_count,
        author: authorSummary,
        community: communitySummary,
        created_at: toISOStringSafe(post.created_at),
        deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
      };
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
