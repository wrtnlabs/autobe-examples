import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestFeedPopular(props: {
  guest: GuestPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const guest = props.guest;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
      userBans: {
        some: {
          reddit_like_user_id: { not: guest.id },
          status: "active",
        },
      },
    },
  };
  const orderBy: Prisma.reddit_like_postsOrderByWithRelationInput[] = [];
  if (props.body.sort === "hot") {
    orderBy.push({ score: "desc" });
    orderBy.push({ created_at: "desc" });
  } else if (props.body.sort === "new") {
    orderBy.push({ created_at: "desc" });
  } else if (props.body.sort === "top") {
    orderBy.push({ score: "desc" });
  } else if (props.body.sort === "controversial") {
    orderBy.push({ score: "desc" });
  } else {
    orderBy.push({ score: "desc" });
    orderBy.push({ created_at: "desc" });
  }
  if (props.body.sort === "top" && props.body.time) {
    const now = new Date();
    const timeFilter: Prisma.DateTimeFilter = {};
    switch (props.body.time) {
      case "today":
        timeFilter.gte = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        break;
      case "week":
        timeFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        timeFilter.gte = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case "year":
        timeFilter.gte = new Date(now.getFullYear() - 1, 0, 1);
        break;
    }
    if (timeFilter.gte) {
      where.created_at = timeFilter;
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_posts.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        author_id: true,
        community_id: true,
        score: true,
        comment_count: true,
        created_at: true,
        author: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            karma_score: true,
            created_at: true,
          },
        },
        community: {
          select: { id: true, name: true, icon_url: true, created_at: true },
        },
      },
    }),
    MyGlobal.prisma.reddit_like_posts.count({ where }),
  ]);
  return {
    data: data.map((post) => ({
      id: post.id,
      title: post.title,
      author: {
        id: post.author_id,
        entity_type: "post",
        title: post.title,
        content: post.author.username,
        score: post.author.karma_score,
        hit_count: 0,
        created_at: toISOStringSafe(post.author.created_at),
      } satisfies IRedditLikeMember.ISummary,
      community: {
        id: post.community_id,
        created_at: toISOStringSafe(post.community.created_at),
        icon_url: post.community.icon_url ?? null,
        name: post.community.name,
      } satisfies IRedditLikeCommunity.ISummary,
      score: post.score,
      comment_count: post.comment_count,
      created_at: toISOStringSafe(post.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
