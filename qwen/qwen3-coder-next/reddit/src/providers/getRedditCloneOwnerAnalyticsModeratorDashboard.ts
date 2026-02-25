import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneOwnerAnalyticsModeratorDashboard(props: {
  owner: OwnerPayload;
}): Promise<IRedditCloneModerator.IAnalytic> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyActiveModerators =
    await MyGlobal.prisma.reddit_clone_moderation_logs.count({
      where: {
        created_at: { gte: today },
      },
    });
  const postsModerated =
    await MyGlobal.prisma.reddit_clone_moderation_logs.count({
      where: {
        target_type: "post",
        created_at: { gte: today },
      },
    });
  const commentsModerated =
    await MyGlobal.prisma.reddit_clone_moderation_logs.count({
      where: {
        target_type: "comment",
        created_at: { gte: today },
      },
    });
  const bansIssued = await MyGlobal.prisma.reddit_clone_ban_records.count({
    where: {
      is_active: true,
      created_at: { gte: today },
    },
  });
  const bansLifted = await MyGlobal.prisma.reddit_clone_ban_records.count({
    where: {
      lifted_at: { gte: today },
    },
  });
  const pendingReports = await MyGlobal.prisma.reddit_clone_reports.count({
    where: {
      status: "pending",
    },
  });
  const resolvedReports =
    await MyGlobal.prisma.reddit_clone_report_actions.count({
      where: {
        created_at: { gte: today },
      },
    });
  return {
    dailyActiveModerators,
    postsModerated,
    commentsModerated,
    bansIssued,
    bansLifted,
    pendingReports,
    resolvedReports,
    approvalRate: 0,
  };
}
