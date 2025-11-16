import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";

export async function patchRedditCommunityPosts(props: {
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "new";

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      deleted_at: null,
    };

    if (props.body.community_id) {
      conditions.reddit_community_community_id = props.body.community_id;
    }

    if (props.body.post_type) {
      conditions.post_type = props.body.post_type;
    }

    if (props.body.author_member_id) {
      conditions.reddit_community_member_id = props.body.author_member_id;
    }

    if (props.body.created_after || props.body.created_before) {
      conditions.created_at = {
        ...(props.body.created_after && {
          gte: new Date(props.body.created_after),
        }),
        ...(props.body.created_before && {
          lte: new Date(props.body.created_before),
        }),
      };
    }

    if (props.body.search) {
      conditions.OR = [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { body: { contains: props.body.search, mode: "insensitive" } },
      ];
    }

    if (sortBy === "top" && props.body.top_time_filter) {
      const now = new Date();
      let timeFilterDate: Date;

      switch (props.body.top_time_filter) {
        case "day":
          timeFilterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          timeFilterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          timeFilterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          timeFilterDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case "all":
        default:
          timeFilterDate = new Date(0);
          break;
      }

      if (!conditions.created_at) {
        conditions.created_at = {};
      }
      (conditions.created_at as Record<string, unknown>).gte = timeFilterDate;
    }

    return conditions;
  };

  const buildOrderBy = () => {
    switch (sortBy) {
      case "hot":
      case "new":
      default:
        return { created_at: "desc" as const };
      case "top":
      case "controversial":
        return { created_at: "desc" as const };
    }
  };

  const whereCondition = buildWhereCondition();

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: buildOrderBy(),
      include: {
        author: true,
        community: true,
      },
    }),
    MyGlobal.prisma.reddit_community_posts.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: page - 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((post) => ({
      id: post.id,
      title: post.title,
      post_type: post.post_type as "text" | "link" | "image",
      vote_score: 0,
      comment_count: 0,
      edited: post.edited,
      created_at: toISOStringSafe(post.created_at),
      author: {
        id: post.author.id,
        username: post.author.username,
        display_name: post.author.display_name ?? undefined,
        bio: post.author.bio ?? undefined,
        avatar_url: post.author.avatar_url ?? undefined,
        post_karma: post.author.post_karma,
        comment_karma: post.author.comment_karma,
        created_at: toISOStringSafe(post.author.created_at),
      },
      community: {
        id: post.community.id,
        name: post.community.name,
        display_title: post.community.display_title,
        description: post.community.description,
        icon_url: post.community.icon_url ?? undefined,
        banner_url: post.community.banner_url ?? undefined,
        subscriber_count: post.community.subscriber_count,
        post_count: post.community.post_count,
        created_at: toISOStringSafe(post.community.created_at),
      },
    })),
  };
}
