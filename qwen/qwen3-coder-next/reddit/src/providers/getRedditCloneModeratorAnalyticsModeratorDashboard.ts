import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorAnalyticsModeratorDashboard(props: {
  moderator: ModeratorPayload;
}): Promise<IRedditCloneModerator.IAnalytic> {
  // Calculate today's date boundaries as strings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString() as string & tags.Format<"date-time">;
  const tomorrowStr = tomorrow.toISOString() as string &
    tags.Format<"date-time">;
  // Count daily active moderators
  const dailyActiveModeratorsResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: string;
      },
    ]
  >`SELECT COUNT(DISTINCT moderator_id) as count FROM reddit_clone_moderation_logs WHERE created_at >= ${todayStr} AND created_at < ${tomorrowStr}`;
  const dailyActiveModerators = parseInt(
    dailyActiveModeratorsResult[0]?.count ?? "0",
  ) as number & tags.Type<"int32">;
  // Count posts moderated
  const postsModeratedResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: string;
      },
    ]
  >`SELECT COUNT(*) as count FROM reddit_clone_moderation_logs WHERE target_type = 'post' AND created_at >= ${todayStr} AND created_at < ${tomorrowStr}`;
  const postsModerated = parseInt(
    postsModeratedResult[0]?.count ?? "0",
  ) as number & tags.Type<"int32">;
  // Count comments moderated
  const commentsModeratedResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: string;
      },
    ]
  >`SELECT COUNT(*) as count FROM reddit_clone_moderation_logs WHERE target_type = 'comment' AND created_at >= ${todayStr} AND created_at < ${tomorrowStr}`;
  const commentsModerated = parseInt(
    commentsModeratedResult[0]?.count ?? "0",
  ) as number & tags.Type<"int32">;
  // Count bans issued
  const bansIssuedResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: string;
      },
    ]
  >`SELECT COUNT(*) as count FROM reddit_clone_ban_records WHERE is_active = true AND created_at >= ${todayStr} AND created_at < ${tomorrowStr}`;
  const bansIssued = parseInt(bansIssuedResult[0]?.count ?? "0") as number &
    tags.Type<"int32">;
  // Count bans lifted
  const bansLiftedResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: string;
      },
    ]
  >`SELECT COUNT(*) as count FROM reddit_clone_ban_records WHERE lifted_at >= ${todayStr} AND lifted_at < ${tomorrowStr}`;
  const bansLifted = parseInt(bansLiftedResult[0]?.count ?? "0") as number &
    tags.Type<"int32">;
  // Count pending reports
  const pendingReportsResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: string;
      },
    ]
  >`SELECT COUNT(*) as count FROM reddit_clone_content_reports WHERE status = 'pending'`;
  const pendingReports = parseInt(
    pendingReportsResult[0]?.count ?? "0",
  ) as number & tags.Type<"int32">;
  // Count resolved reports
  const resolvedReportsResult = await MyGlobal.prisma.$queryRaw<
    [
      {
        count: string;
      },
    ]
  >`SELECT COUNT(*) as count FROM reddit_clone_content_reports WHERE status IN ('approved', 'dismissed')`;
  const resolvedReports = parseInt(
    resolvedReportsResult[0]?.count ?? "0",
  ) as number & tags.Type<"int32">;
  // Calculate approval rate
  let approvalRate: number & tags.Minimum<0> & tags.Maximum<100> = 0 as number &
    tags.Minimum<0> &
    tags.Maximum<100>;
  if (resolvedReports > 0) {
    const approvedResult = await MyGlobal.prisma.$queryRaw<
      [
        {
          count: string;
        },
      ]
    >`SELECT COUNT(*) as count FROM reddit_clone_content_reports WHERE status = 'approved'`;
    const approved = parseInt(approvedResult[0]?.count ?? "0");
    approvalRate = ((approved / resolvedReports) * 100) as number &
      tags.Minimum<0> &
      tags.Maximum<100>;
  }
  return {
    dailyActiveModerators,
    postsModerated,
    commentsModerated,
    bansIssued,
    bansLifted,
    pendingReports,
    resolvedReports,
    approvalRate,
  };
}
