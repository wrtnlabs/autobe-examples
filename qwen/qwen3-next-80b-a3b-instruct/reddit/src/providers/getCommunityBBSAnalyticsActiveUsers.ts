import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAnalyticsActiveUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsActiveUsers";

export async function getCommunityBBSAnalyticsActiveUsers(): Promise<ICommunityBBSAnalyticsActiveUsers> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isoThirtyDaysAgo: string & tags.Format<"date-time"> =
    toISOStringSafe(thirtyDaysAgo);

  const activeUserCount =
    await MyGlobal.prisma.community_bbs_user_activity_summary.count({
      where: {
        OR: [
          { last_post_at: { gte: isoThirtyDaysAgo } },
          { last_comment_at: { gte: isoThirtyDaysAgo } },
        ],
      },
    });

  return activeUserCount;
}
