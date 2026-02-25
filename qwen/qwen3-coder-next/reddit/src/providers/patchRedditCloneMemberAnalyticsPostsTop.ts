import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
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

export async function patchRedditCloneMemberAnalyticsPostsTop(props: {
  member: MemberPayload;
  body: IRedditCloneContentPost.IRequest;
}): Promise<IPageIRedditCloneContentPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.reddit_clone_content_postsWhereInput = {
    deleted_at: null,
  };
  // Apply time filter for top sorting
  if (props.body.timeFilter && props.body.sort === "top") {
    const now = new Date();
    let startDate: Date;
    switch (props.body.timeFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate(),
        );
        break;
      case "year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
        break;
      case "allTime":
      default:
        startDate = new Date(0); // No time filter
        break;
    }
    whereClause.created_at = { gte: startDate };
  }
  const orderBy: Prisma.reddit_clone_content_postsOrderByWithRelationInput =
    props.body.sort === "hot"
      ? { vote_score: "desc", created_at: "desc" }
      : props.body.sort === "new"
        ? { created_at: "desc" }
        : props.body.sort === "top"
          ? { vote_score: "desc" }
          : props.body.sort === "controversial"
            ? { vote_score: "asc" }
            : { vote_score: "desc", created_at: "desc" };
  const data = await MyGlobal.prisma.reddit_clone_content_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          subscriber_count: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      },
      vote_score: true,
      comment_count: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_content_posts.count({
    where: whereClause,
  });
  return {
    data: data.map((post) => ({
      id: post.id as string & tags.Format<"uuid">,
      title: post.title,
      author: {
        id: post.author.id as string & tags.Format<"uuid">,
        username: post.author.username,
        displayName: post.author.display_name ?? undefined,
        avatarUrl: post.author.avatar_url ?? undefined,
      },
      community: {
        id: post.community.id as string & tags.Format<"uuid">,
        name: post.community.name,
        description: post.community.description ?? undefined,
        iconUrl: post.community.icon_url ?? undefined,
        subscriberCount: post.community.subscriber_count,
        createdAt: post.community.created_at.toISOString() as string &
          tags.Format<"date-time">,
        owner: {
          id: post.community.owner.id as string & tags.Format<"uuid">,
          username: post.community.owner.username,
          displayName: post.community.owner.display_name ?? undefined,
          avatarUrl: post.community.owner.avatar_url ?? undefined,
        },
      },
      voteScore: post.vote_score,
      commentCount: post.comment_count,
      viewCount: 0,
      upvoteCount: 0,
      downvoteCount: 0,
      timeAgo: "",
      trendingScore: 0,
      engagementRate: 0,
      created_at: post.created_at.toISOString() as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
