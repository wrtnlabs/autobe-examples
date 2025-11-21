import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSContentTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSContentTrends";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityBBSAdminAnalyticsContentTrends(props: {
  admin: AdminPayload;
}): Promise<ICommunityBBSContentTrends> {
  const results = (await MyGlobal.prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', p.created_at) as period,
      COUNT(p.id) as post_count,
      COUNT(c.id) as comment_count,
      COUNT(c.id) / NULLIF(COUNT(p.id), 0) as comment_to_post_ratio,
      ccat.name as category_name,
      COUNT(*) as category_post_count
    FROM community_bbs_posts p
    LEFT JOIN community_bbs_post_categories pc ON p.id = pc.post_id
    LEFT JOIN community_bbs_content_categories ccat ON pc.content_category_id = ccat.id
    LEFT JOIN community_bbs_comments c ON p.id = c.post_id
    WHERE p.status = 'published' AND p.deleted_at IS NULL
    GROUP BY DATE_TRUNC('day', p.created_at), ccat.name
    ORDER BY period DESC, category_post_count DESC
  `) as Array<{
    period: string | Date;
    post_count: string;
    comment_count: string;
    comment_to_post_ratio: string | null;
    category_name: string | null;
    category_post_count: string;
  }>; // Explicit cast to match query shape

  return results.map((item) => ({
    period: toISOStringSafe(item.period),
    post_count: item.post_count ? Number(item.post_count) : 0,
    comment_count: item.comment_count ? Number(item.comment_count) : 0,
    comment_to_post_ratio: item.comment_to_post_ratio
      ? Number(item.comment_to_post_ratio)
      : 0,
    category_name: item.category_name || "", // Ensure string
    category_post_count: item.category_post_count
      ? Number(item.category_post_count)
      : 0,
  }));
}
