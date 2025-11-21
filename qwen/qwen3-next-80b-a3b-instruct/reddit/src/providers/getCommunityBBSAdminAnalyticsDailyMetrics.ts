import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAnalyticsDailyMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsDailyMetrics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityBBSAdminAnalyticsDailyMetrics(props: {
  admin: AdminPayload;
}): Promise<ICommunityBBSAnalyticsDailyMetrics> {
  const [postsCount, commentsCount, reportsCount, averageKarma, trustedCount] =
    await Promise.all([
      MyGlobal.prisma.community_bbs_posts.count({
        where: {
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: "published",
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.community_bbs_comments.count({
        where: {
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          business_status: "approved",
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.community_bbs_reports.count({
        where: {
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.community_bbs_user_karma_summary
        .aggregate({
          _avg: { karma_score: true },
        })
        .then((result) => result._avg.karma_score),
      MyGlobal.prisma.community_bbs_user_karma_summary.count({
        where: {
          trusted_contributor: true,
        },
      }),
    ]);

  const metrics = {
    posts_24h: postsCount,
    comments_24h: commentsCount,
    reports_24h: reportsCount,
    average_karma: averageKarma || 0,
    trusted_contributors: trustedCount,
  };

  return JSON.stringify(metrics) as ICommunityBBSAnalyticsDailyMetrics;
}
