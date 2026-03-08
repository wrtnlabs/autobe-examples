import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikePopular(props: {
  query: {
    sort?: "hot" | "new" | "top" | "controversial";
    time?: "today" | "this_week" | "this_month" | "this_year" | "all_time";
    limit?: number;
    offset?: number;
  };
}): Promise<IRedditLikePost[]> {
  const sort = props.query.sort ?? "hot";
  const time = props.query.time ?? "all_time";
  const limit = Math.min(props.query.limit ?? 20, 100);
  const offset = props.query.offset ?? 0;
  const now = new Date();
  let timeFilter: Record<string, Date> | undefined;
  switch (time) {
    case "today":
      timeFilter = {
        gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      };
      break;
    case "this_week":
      timeFilter = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case "this_month":
      timeFilter = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      break;
    case "this_year":
      timeFilter = { gte: new Date(now.getFullYear(), 0, 1) };
      break;
    case "all_time":
    default:
      timeFilter = undefined;
      break;
  }
  const whereConditions: Prisma.reddit_like_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
    },
    ...(timeFilter && { created_at: timeFilter }),
  };
  let orderBy: Prisma.reddit_like_postsOrderByWithRelationInput[];
  switch (sort) {
    case "new":
      orderBy = [{ created_at: "desc" }];
      break;
    case "top":
      orderBy = [{ score: "desc" }, { created_at: "desc" }];
      break;
    case "controversial":
      orderBy = [{ score: "asc" }, { created_at: "desc" }];
      break;
    case "hot":
    default:
      orderBy = [{ score: "desc" }, { created_at: "desc" }];
      break;
  }
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereConditions,
    orderBy,
    skip: offset,
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          icon_url: true,
          created_at: true,
        },
      },
    },
  });
  return posts.map((post) => ({
    id: post.id,
    author: {
      id: post.author.id,
      entity_type: "post" as const,
      title: post.title,
      content: post.content?.substring(0, 200) || "",
      score: post.score,
      hit_count: 0,
      created_at: toISOStringSafe(post.author.created_at),
    },
    community: {
      id: post.community.id,
      name: post.community.name,
      icon_url: post.community.icon_url,
      created_at: toISOStringSafe(post.community.created_at),
    },
    title: post.title,
    type: post.type,
    content: post.content,
    url: post.url,
    image_url: post.image_url,
    score: post.score,
    comment_count: post.comment_count,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
  }));
}
