import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IDiscussionBoardSecurityEventActorBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEventActorBreakdown";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSecurityEventsAnalytics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSecurityEvent.IAnalyticsRequest;
}): Promise<IDiscussionBoardSecurityEvent.IAnalytic> {
  // Build WHERE clause based on filter parameters
  const whereInput: Prisma.discussion_board_security_eventsWhereInput = {
    ...(props.body.event_type &&
      props.body.event_type.length > 0 && {
        event_type: { in: props.body.event_type },
      }),
    ...(props.body.severity &&
      props.body.severity.length > 0 && {
        severity: { in: props.body.severity },
      }),
    ...(props.body.resolved !== undefined && { resolved: props.body.resolved }),
    ...(props.body.start_date && {
      created_at: { gte: props.body.start_date },
    }),
    ...(props.body.end_date && { created_at: { lte: props.body.end_date } }),
  };
  // Get total events count
  const totalEvents =
    await MyGlobal.prisma.discussion_board_security_events.count({
      where: whereInput,
    });
  // Get resolved events count
  const resolvedEvents =
    await MyGlobal.prisma.discussion_board_security_events.count({
      where: { ...whereInput, resolved: true },
    });
  // Calculate resolution rate
  const resolutionRate =
    totalEvents > 0 ? (resolvedEvents / totalEvents) * 100 : 0;
  // Get events by type
  const eventsByTypeData =
    await MyGlobal.prisma.discussion_board_security_events.groupBy({
      by: ["event_type"],
      where: whereInput,
      _count: { _all: true },
    });
  // Get events by severity
  const eventsBySeverityData =
    await MyGlobal.prisma.discussion_board_security_events.groupBy({
      by: ["severity"],
      where: whereInput,
      _count: { _all: true },
    });
  // Get actor breakdown
  const userEvents =
    await MyGlobal.prisma.discussion_board_security_events.count({
      where: { ...whereInput, user_id: { not: null } },
    });
  const adminEvents =
    await MyGlobal.prisma.discussion_board_security_events.count({
      where: { ...whereInput, admin_id: { not: null } },
    });
  const superAdminEvents =
    await MyGlobal.prisma.discussion_board_security_events.count({
      where: { ...whereInput, super_admin_id: { not: null } },
    });
  // Get temporal trends - group by day for last 30 days
  const thirtyDaysAgo = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const temporalTrendsData =
    await MyGlobal.prisma.discussion_board_security_events.groupBy({
      by: ["created_at"],
      where: {
        ...whereInput,
        created_at: { gte: thirtyDaysAgo },
      },
      _count: { _all: true },
    });
  // Get recent activity (last 7 days)
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  const recentActivityData =
    await MyGlobal.prisma.discussion_board_security_events.groupBy({
      by: ["event_type", "severity"],
      where: {
        ...whereInput,
        created_at: { gte: sevenDaysAgo },
      },
      _count: { _all: true },
    });
  // Transform eventsByType to match the expected interface
  const eventsByType = {} as Record<string, number>;
  eventsByTypeData.forEach((item) => {
    eventsByType[item.event_type] = item._count._all;
  });
  // Transform eventsBySeverity to match the expected interface
  const eventsBySeverity = {} as Record<string, number>;
  eventsBySeverityData.forEach((item) => {
    eventsBySeverity[item.severity] = item._count._all;
  });
  // Transform temporal trends
  const temporalTrends = {} as Record<string, number>;
  temporalTrendsData.forEach((item) => {
    const date = item.created_at.toISOString().split("T")[0];
    temporalTrends[date] = item._count._all;
  });
  // Transform recent activity
  const recentActivity = {} as Record<string, number>;
  recentActivityData.forEach((item) => {
    const key = `${item.event_type}_${item.severity}`;
    recentActivity[key] = item._count._all;
  });
  return {
    totalEvents: totalEvents,
    eventsByType: eventsByType as any,
    eventsBySeverity: eventsBySeverity as any,
    resolutionRate,
    unresolvedEvents: totalEvents - resolvedEvents,
    eventsByActor: {
      user: userEvents,
      admin: adminEvents,
      super_admin: superAdminEvents,
    },
    temporalTrends: temporalTrends as any,
    recentActivity: recentActivity as any,
  };
}
