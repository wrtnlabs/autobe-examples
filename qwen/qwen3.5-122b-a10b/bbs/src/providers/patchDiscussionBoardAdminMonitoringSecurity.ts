import { IAuthenticationMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthenticationMetric";
import { IDateRangePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRangePeriod";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSecurityMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityMonitoring";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSecurityMonitoring } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityMonitoring";
import { ISecurityAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ISecurityAlert";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAuditLogAtSummaryTransformer } from "../transformers/DiscussionBoardAuditLogAtSummaryTransformer";
import { DiscussionBoardBanRecordAtSummaryTransformer } from "../transformers/DiscussionBoardBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminMonitoringSecurity(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSecurityMonitoring.IRequest;
}): Promise<IPageIDiscussionBoardSecurityMonitoring> {
  // Parse date range
  const startDate = props.body.startDate
    ? new Date(props.body.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = props.body.endDate
    ? new Date(props.body.endDate)
    : new Date();
  // Calculate days in range
  const daysInRange = Math.max(
    1,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for audit logs
  const auditLogsWhereInput: Prisma.discussion_board_audit_logsWhereInput = {
    created_at: {
      gte: startDate,
      lte: endDate,
    },
  };
  // Count failed login attempts
  const failedLoginCount =
    await MyGlobal.prisma.discussion_board_audit_logs.count({
      where: {
        ...auditLogsWhereInput,
        action_type: {
          contains: "login",
        },
      },
    });
  // Aggregate failed logins by IP address using groupBy
  const failedLoginsByIpRaw =
    await MyGlobal.prisma.discussion_board_audit_logs.groupBy({
      by: ["ip_address"],
      where: {
        ...auditLogsWhereInput,
        action_type: {
          contains: "login",
        },
        ip_address: {
          not: null,
        },
      },
      _count: {
        ip_address: true,
      },
    });
  const failedLoginsByIp: {
    [key: string]: number;
  } = {};
  for (const record of failedLoginsByIpRaw) {
    if (record.ip_address !== null) {
      failedLoginsByIp[record.ip_address] = record._count.ip_address;
    }
  }
  // Count active bans
  const activeBanCount =
    await MyGlobal.prisma.discussion_board_ban_records.count({
      where: {
        unbanned_at: null,
        deleted_at: null,
      },
    });
  // Get recent ban activities
  const recentBanActivitiesRaw =
    await MyGlobal.prisma.discussion_board_ban_records.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: {
        banned_at: "desc",
      },
      skip,
      take: limit,
      ...DiscussionBoardBanRecordAtSummaryTransformer.select(),
    });
  const recentBanActivities = await ArrayUtil.asyncMap(
    recentBanActivitiesRaw,
    DiscussionBoardBanRecordAtSummaryTransformer.transform,
  );
  // Get security events
  const securityEventsRaw =
    await MyGlobal.prisma.discussion_board_audit_logs.findMany({
      where: {
        ...auditLogsWhereInput,
        action_type: {
          in: ["user.ban", "user.unban", "article.delete", "comment.delete"],
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
      ...DiscussionBoardAuditLogAtSummaryTransformer.select(),
    });
  const securityEvents = await ArrayUtil.asyncMap(
    securityEventsRaw,
    DiscussionBoardAuditLogAtSummaryTransformer.transform,
  );
  // Total count for pagination
  const totalSecurityEvents =
    await MyGlobal.prisma.discussion_board_audit_logs.count({
      where: {
        ...auditLogsWhereInput,
        action_type: {
          in: ["user.ban", "user.unban", "article.delete", "comment.delete"],
        },
      },
    });
  // Generate suspicious alerts
  const suspiciousAlerts: ISecurityAlert[] = [];
  for (const [ip, count] of Object.entries(failedLoginsByIp)) {
    if (count >= 5) {
      suspiciousAlerts.push({
        alert_id: typia.random<string & tags.Format<"uuid">>(),
        type: "failed_login_spike",
        severity: count >= 10 ? "high" : "medium",
        description: `Failed login spike detected - ${count} attempts from IP ${ip}`,
        detected_at: typia.random<string & tags.Format<"date-time">>(),
        related_entity_type: "ip_address",
        related_entity_id: ip,
        ip_address: ip,
        status: "new",
      });
    }
  }
  // Build authentication metrics
  const loginSuccessCount =
    await MyGlobal.prisma.discussion_board_audit_logs.count({
      where: {
        ...auditLogsWhereInput,
        action_type: {
          in: ["member.login", "admin.login"],
        },
      },
    });
  const totalLoginAttempts = loginSuccessCount + failedLoginCount;
  const loginSuccessRate =
    totalLoginAttempts > 0 ? (loginSuccessCount / totalLoginAttempts) * 100 : 0;
  const loginFailureRate =
    totalLoginAttempts > 0 ? (failedLoginCount / totalLoginAttempts) * 100 : 0;
  // Calculate peak login hour
  const loginHourRaw = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      hour: number;
      count: number;
    }>
  >(
    `
    SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as count
    FROM discussion_board_audit_logs
    WHERE action_type IN ('member.login', 'admin.login')
    AND created_at >= $1
    AND created_at <= $2
    GROUP BY hour
    ORDER BY count DESC
    LIMIT 1
  `,
    startDate,
    endDate,
  );
  const peakLoginHour = loginHourRaw.length > 0 ? loginHourRaw[0].hour : 0;
  const authenticationMetrics: IAuthenticationMetric = {
    login_success_count: loginSuccessCount,
    login_failure_count: failedLoginCount,
    login_success_rate: loginSuccessRate,
    login_failure_rate: loginFailureRate,
    failed_logins_by_ip: failedLoginsByIp,
    unique_login_ips: Object.keys(failedLoginsByIp).length,
    peak_login_hour: peakLoginHour,
    average_logins_per_day: totalLoginAttempts / daysInRange,
  };
  // Build period
  const period: IDateRangePeriod = {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
  return {
    data: [
      {
        failed_login_count: failedLoginCount,
        failed_logins_by_ip: failedLoginsByIp,
        active_ban_count: activeBanCount,
        recent_ban_activities: recentBanActivities,
        security_events: securityEvents,
        suspicious_alerts: suspiciousAlerts,
        authentication_metrics: authenticationMetrics,
        period,
      },
    ],
    pagination: {
      current: page,
      limit,
      records: totalSecurityEvents,
      pages: Math.ceil(totalSecurityEvents / limit),
    },
  };
}
