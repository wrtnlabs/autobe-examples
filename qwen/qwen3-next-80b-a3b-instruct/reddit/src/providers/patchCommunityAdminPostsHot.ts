import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityAdminPostsHot(props: {
  admin: AdminPayload;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const content_type = (props.body as any).content_type ?? null;
  const domain_name = (props.body as any).domain_name ?? null;
  const community_name = (props.body as any).community_name ?? null;
  const created_at_range = (props.body as any).created_at_range ?? null;
  const page_token = (props.body as any).page_token ?? null;
  const whereClause: any = {
    sort_algorithm: "hot",
    is_active: true,
  };
  if (content_type) {
    whereClause.post_type = content_type;
  }
  if (domain_name) {
    whereClause.domain_name = { contains: domain_name };
  }
  if (community_name) {
    whereClause.community_name = { contains: community_name };
  }
  if (created_at_range && created_at_range.gte && created_at_range.lte) {
    whereClause.created_at = {
      gte: created_at_range.gte,
      lte: created_at_range.lte,
    };
  }
  const orderBy: any = {
    sort_order: "desc",
  };
  if (page_token) {
    const cacheEntry =
      await MyGlobal.prisma.community_mv_feed_cache_entries.findUnique({
        where: {
          feed_type_sort_algorithm_page_token_month_partition: {
            feed_type: "popular",
            sort_algorithm: "hot",
            page_token: page_token,
            month_partition: toISOStringSafe(new Date()).substring(0, 7),
          },
        },
      });
    if (!cacheEntry) {
      throw new HttpException("Page not found in cache", 404);
    }
    const parsedPayload = JSON.parse(cacheEntry.payload);
    if (!parsedPayload.pagination || !Array.isArray(parsedPayload.data)) {
      throw new HttpException("Invalid cache payload structure", 500);
    }
    return parsedPayload;
  } else {
    const limit = 20;
    const data =
      await MyGlobal.prisma.community_mv_community_popular_feeds.findMany({
        where: whereClause,
        orderBy: orderBy,
        take: limit,
      });
    const total =
      await MyGlobal.prisma.community_mv_community_popular_feeds.count({
        where: whereClause,
      });
    // Transform materialized view data directly to ICommunityPost.ISummary without transformer
    const transformedData = data.map((item) => ({
      id: item.community_post_id,
      title: item.title,
      author: {
        id: "" as string & tags.Format<"uuid">,
        display_name: item.author_username,
        is_email_verified: false,
        created_at: item.created_at.toISOString() as string &
          tags.Format<"date-time">,
      },
      community: {
        id: "" as string & tags.Format<"uuid">,
        name: item.community_name,
        description: "",
        icon_url: "",
        created_at: item.created_at.toISOString() as string &
          tags.Format<"date-time">,
      },
      vote_score: item.vote_score,
      comment_count: item.comment_count,
      content_preview: item.content_preview || "",
      created_at: item.created_at.toISOString() as string &
        tags.Format<"date-time">,
      content_type: item.post_type as "text" | "link" | "image",
      domain_name: item.domain_name || undefined,
      is_active: item.is_active,
    }));
    const pagination: IPage.IPagination = {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    };
    const response: IPageICommunityPost.ISummary = {
      data: transformedData,
      pagination: pagination,
    };
    const newPageToken = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.community_mv_feed_cache_entries.create({
      data: {
        id: v4(),
        feed_type: "popular",
        sort_algorithm: "hot",
        page_token: newPageToken,
        month_partition: toISOStringSafe(new Date()).substring(0, 7),
        payload: JSON.stringify(response),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        last_updated: toISOStringSafe(new Date()),
      },
    });
    return response;
  }
}
