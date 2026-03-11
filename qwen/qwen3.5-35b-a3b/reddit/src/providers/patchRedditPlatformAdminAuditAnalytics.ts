import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function patchRedditPlatformAdminAuditAnalytics(props: {
  admin: AdminPayload;
  body: IRedditPlatformAdminAuditLog.IRequest;
}): Promise<IPageIRedditPlatformAdminAuditLog.ISummary> {
  // Validate date range
  if (props.body.startDate && props.body.endDate) {
    if (props.body.startDate > props.body.endDate) {
      throw new HttpException(
        "Invalid date range: startDate must be <= endDate",
        400,
      );
    }
  }
  // Calculate page and limit
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where conditions for admin audit logs
  const adminAuditLogs =
    await MyGlobal.prisma.reddit_platform_admin_audit_logs.findMany({
      where: {
        created_at: {
          ...(props.body.startDate && { gte: new Date(props.body.startDate) }),
          ...(props.body.endDate && { lte: new Date(props.body.endDate) }),
        },
        ...(props.body.adminIds && { admin_id: { in: props.body.adminIds } }),
        ...(props.body.actionTypes && {
          action_type: { in: props.body.actionTypes },
        }),
      },
      take: limit,
      skip,
      orderBy: {
        created_at: (props.body.sortOrder ?? "desc") === "asc" ? "asc" : "desc",
      },
    });
  // Build where conditions for moderation audit logs
  const moderationAuditLogs =
    await MyGlobal.prisma.reddit_platform_moderation_audit_logs.findMany({
      where: {
        created_at: {
          ...(props.body.startDate && { gte: new Date(props.body.startDate) }),
          ...(props.body.endDate && { lte: new Date(props.body.endDate) }),
        },
        ...(props.body.moderatorIds && {
          moderator_id: { in: props.body.moderatorIds },
        }),
        ...(props.body.communityIds && {
          community_id: { in: props.body.communityIds },
        }),
        ...(props.body.actionTypes && {
          action_type: { in: props.body.actionTypes },
        }),
      },
      take: limit,
      skip,
      orderBy: {
        created_at: (props.body.sortOrder ?? "desc") === "asc" ? "asc" : "desc",
      },
    });
  // Build where conditions for report snapshots
  const reportSnapshots =
    await MyGlobal.prisma.reddit_platform_report_snapshots.findMany({
      where: {
        created_at: {
          ...(props.body.startDate && { gte: new Date(props.body.startDate) }),
          ...(props.body.endDate && { lte: new Date(props.body.endDate) }),
        },
        ...(props.body.communityIds && {
          community_id: { in: props.body.communityIds },
        }),
      },
      take: limit,
      skip,
      orderBy: {
        created_at: (props.body.sortOrder ?? "desc") === "asc" ? "asc" : "desc",
      },
    });
  // Build where conditions for report views
  const reportViews =
    await MyGlobal.prisma.reddit_platform_report_views.findMany({
      where: {
        viewed_at: {
          ...(props.body.startDate && { gte: new Date(props.body.startDate) }),
          ...(props.body.endDate && { lte: new Date(props.body.endDate) }),
        },
        ...(props.body.moderatorIds && {
          moderator_id: { in: props.body.moderatorIds },
        }),
        ...(props.body.communityIds && {
          community_id: { in: props.body.communityIds },
        }),
      },
      take: limit,
      skip,
      orderBy: {
        viewed_at: (props.body.sortOrder ?? "desc") === "asc" ? "asc" : "desc",
      },
    });
  // Calculate real-time counts
  const [memberCount, postCount, commentCount, communityCount] =
    await Promise.all([
      MyGlobal.prisma.reddit_platform_members.count(),
      MyGlobal.prisma.reddit_platform_posts.count(),
      MyGlobal.prisma.reddit_platform_comments.count(),
      MyGlobal.prisma.reddit_platform_communities.count(),
    ]);
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const aggregatedMetrics: Array<IRedditPlatformAdminAuditLog.ISummary> = [];
  // Aggregate admin action counts
  if (
    !props.body.metricTypes ||
    props.body.metricTypes.includes("admin_activity")
  ) {
    const adminActionCounts =
      await MyGlobal.prisma.reddit_platform_admin_audit_logs.groupBy({
        by: ["action_type"],
        where: {
          ...(props.body.startDate && {
            created_at: { gte: new Date(props.body.startDate) },
          }),
          ...(props.body.endDate && {
            created_at: { lte: new Date(props.body.endDate) },
          }),
          ...(props.body.adminIds && { admin_id: { in: props.body.adminIds } }),
        },
        _count: { id: true },
      });
    for (const actionCount of adminActionCounts) {
      aggregatedMetrics.push({
        metric_name: `ADMIN_${actionCount.action_type}_COUNT`,
        metric_value: actionCount._count.id,
        metric_type: "ADMIN_ACTIONS",
        timestamp: now,
        context: { action_type: actionCount.action_type },
        granularity: "all_time",
        total_value: actionCount._count.id,
      });
    }
  }
  // Aggregate moderator action counts
  if (
    !props.body.metricTypes ||
    props.body.metricTypes.includes("moderator_activity")
  ) {
    const moderatorActionCounts =
      await MyGlobal.prisma.reddit_platform_moderation_audit_logs.groupBy({
        by: ["moderator_id", "action_type"],
        where: {
          ...(props.body.startDate && {
            created_at: { gte: new Date(props.body.startDate) },
          }),
          ...(props.body.endDate && {
            created_at: { lte: new Date(props.body.endDate) },
          }),
          ...(props.body.moderatorIds && {
            moderator_id: { in: props.body.moderatorIds },
          }),
          ...(props.body.communityIds && {
            community_id: { in: props.body.communityIds },
          }),
        },
        _count: { id: true },
      });
    for (const action of moderatorActionCounts) {
      const moderatorData =
        await MyGlobal.prisma.reddit_platform_members.findUnique({
          where: { id: action.moderator_id },
          select: {
            id: true,
            username: true,
            display_name: true,
            karma_score: true,
            is_active: true,
            created_at: true,
          },
        });
      if (moderatorData) {
        aggregatedMetrics.push({
          metric_name: "MODERATOR_ACTION_COUNT",
          metric_value: action._count.id,
          metric_type: "MODERATOR_ACTIONS",
          timestamp: now,
          context: { action_type: action.action_type },
          granularity: "all_time",
          total_value: action._count.id,
          moderator: {
            id: moderatorData.id,
            username: moderatorData.username,
            display_name: moderatorData.display_name,
            karma_score: moderatorData.karma_score,
            is_active: moderatorData.is_active,
            created_at: toISOStringSafe(moderatorData.created_at),
          } satisfies IRedditPlatformMember.ISummary,
        });
      }
    }
  }
  // Aggregate report metrics
  if (
    !props.body.metricTypes ||
    props.body.metricTypes.includes("report_metrics")
  ) {
    const reportResolutionStats =
      await MyGlobal.prisma.reddit_platform_report_snapshots.groupBy({
        by: ["status"],
        where: {
          ...(props.body.startDate && {
            created_at: { gte: new Date(props.body.startDate) },
          }),
          ...(props.body.endDate && {
            created_at: { lte: new Date(props.body.endDate) },
          }),
        },
        _count: { id: true },
      });
    for (const statusCount of reportResolutionStats) {
      const count = statusCount._count.id;
      aggregatedMetrics.push({
        metric_name: `REPORT_${statusCount.status}_COUNT`,
        metric_value: count,
        metric_type: "REPORT_METRICS",
        timestamp: now,
        context: { resolution_status: statusCount.status },
        granularity: "all_time",
        total_value: count,
      });
    }
  }
  // Real-time entity counts
  if (
    !props.body.metricTypes ||
    props.body.metricTypes.includes("user_count") ||
    props.body.metricTypes.includes("post_count") ||
    props.body.metricTypes.includes("comment_count")
  ) {
    aggregatedMetrics.push({
      metric_name: "REALTIME_USER_COUNT",
      metric_value: memberCount,
      metric_type: "REALTIME_ENTITY_COUNTS",
      timestamp: now,
      context: { entity_type: "members" },
      total_value: memberCount,
    });
    aggregatedMetrics.push({
      metric_name: "REALTIME_POST_COUNT",
      metric_value: postCount,
      metric_type: "REALTIME_ENTITY_COUNTS",
      timestamp: now,
      context: { entity_type: "posts" },
      total_value: postCount,
    });
    aggregatedMetrics.push({
      metric_name: "REALTIME_COMMENT_COUNT",
      metric_value: commentCount,
      metric_type: "REALTIME_ENTITY_COUNTS",
      timestamp: now,
      context: { entity_type: "comments" },
      total_value: commentCount,
    });
    aggregatedMetrics.push({
      metric_name: "REALTIME_COMMUNITY_COUNT",
      metric_value: communityCount,
      metric_type: "REALTIME_ENTITY_COUNTS",
      timestamp: now,
      context: { entity_type: "communities" },
      total_value: communityCount,
    });
  }
  // Apply sorting
  const sortFn = (
    a: IRedditPlatformAdminAuditLog.ISummary,
    b: IRedditPlatformAdminAuditLog.ISummary,
  ): number => {
    switch (props.body.sortBy) {
      case "metric_value":
        return a.metric_value < b.metric_value
          ? -1
          : a.metric_value > b.metric_value
            ? 1
            : 0;
      case "timestamp":
        return a.timestamp < b.timestamp
          ? -1
          : a.timestamp > b.timestamp
            ? 1
            : 0;
      case "action_type":
        const contextA = a.context?.action_type || "";
        const contextB = b.context?.action_type || "";
        return contextA < contextB ? -1 : contextA > contextB ? 1 : 0;
      default:
        return 0;
    }
  };
  const sortedMetrics = aggregatedMetrics.sort((a, b) => {
    const result = sortFn(a, b);
    return (props.body.sortOrder ?? "desc") === "asc" ? result : -result;
  });
  // Apply cursor pagination if provided
  let finalMetrics = sortedMetrics;
  if (props.body.cursor) {
    finalMetrics = sortedMetrics.slice(skip, skip + limit);
  } else {
    finalMetrics = sortedMetrics.slice(skip, skip + limit);
  }
  // Calculate total
  const total = aggregatedMetrics.length;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: finalMetrics,
  } satisfies IPageIRedditPlatformAdminAuditLog.ISummary;
}
