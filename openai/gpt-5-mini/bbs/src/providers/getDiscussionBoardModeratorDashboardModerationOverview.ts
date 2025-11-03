import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationOverview";
import { IKeyValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IKeyValue";
import { IProcessingTime } from "@ORGANIZATION/PROJECT-api/lib/structures/IProcessingTime";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorDashboardModerationOverview(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardModerationOverview> {
  const { moderator } = props;

  // Authorization: ensure moderator exists and not soft-deleted
  const foundModerator =
    await MyGlobal.prisma.discussion_board_moderator.findFirst({
      where: { id: moderator.id, deleted_at: null },
      select: { id: true },
    });
  if (!foundModerator) {
    throw new HttpException(
      "Unauthorized: moderator not found or inactive",
      403,
    );
  }

  try {
    // Time window boundaries as ISO strings
    const nowIso = toISOStringSafe(new Date());
    const iso24h = toISOStringSafe(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const iso7d = toISOStringSafe(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );

    // Parallel basic aggregations
    const [pending24, pending7, actionGroups, recentReports, recentAudits] =
      await Promise.all([
        MyGlobal.prisma.discussion_board_reports.count({
          where: { status: "pending", created_at: { gte: iso24h } },
        }),
        MyGlobal.prisma.discussion_board_reports.count({
          where: { status: "pending", created_at: { gte: iso7d } },
        }),
        // Group by action_type for breakdown
        MyGlobal.prisma.discussion_board_moderation_actions.groupBy({
          by: ["action_type"],
          _count: { action_type: true },
        }),
        // Fetch recent processed reports for processing-time metrics (limit to recent 1000)
        MyGlobal.prisma.discussion_board_reports.findMany({
          where: { processed_at: { not: null }, created_at: { gte: iso7d } },
          select: {
            id: true,
            created_at: true,
            processed_at: true,
            closed_at: true,
          },
          take: 1000,
        }),
        // Recent high-priority audits
        MyGlobal.prisma.discussion_board_moderation_audit.findMany({
          where: {
            event_type: {
              in: ["moderation.action", "report.filed", "appeal.submitted"],
            },
          },
          orderBy: { occurred_at: "desc" },
          take: 10,
          select: {
            id: true,
            event_type: true,
            occurred_at: true,
            event_payload: true,
          },
        }),
      ]);

    // Build actions_breakdown
    const actions_breakdown: IKeyValue[] = actionGroups.map((g) => ({
      key: g.action_type,
      value: Number(g._count.action_type),
    }));

    // Processing time calculations
    const reportIds = recentReports.map((r) => r.id);
    let average_processing_times: IProcessingTime[] = [];

    if (reportIds.length > 0) {
      const actions =
        await MyGlobal.prisma.discussion_board_moderation_actions.findMany({
          where: { discussion_board_report_id: { in: reportIds } },
          select: { discussion_board_report_id: true, created_at: true },
          orderBy: { created_at: "asc" },
        });

      // earliest action per report
      const earliestActionByReport: Record<string, Date> = {} as Record<
        string,
        Date
      >;
      for (const a of actions) {
        const rid = a.discussion_board_report_id;
        // Only use rid as an object key when it is a non-null string
        if (rid !== null && rid !== undefined) {
          if (!earliestActionByReport[rid]) {
            earliestActionByReport[rid] = a.created_at;
          }
        }
      }

      // compute time_to_first_action (in seconds)
      const firstActionDiffs: number[] = [];
      const resolutionDiffs: number[] = [];

      for (const r of recentReports) {
        const reportId = r.id;
        if (reportId !== null && reportId !== undefined) {
          const ea = earliestActionByReport[reportId];
          if (ea) {
            const diffSec = (ea.getTime() - r.created_at.getTime()) / 1000;
            if (Number.isFinite(diffSec) && diffSec >= 0)
              firstActionDiffs.push(diffSec);
          }
        }

        if (r.closed_at) {
          const diffRes =
            (r.closed_at.getTime() - r.created_at.getTime()) / 1000;
          if (Number.isFinite(diffRes) && diffRes >= 0)
            resolutionDiffs.push(diffRes);
        }
      }

      if (firstActionDiffs.length > 0) {
        const avg =
          firstActionDiffs.reduce((a, b) => a + b, 0) / firstActionDiffs.length;
        average_processing_times.push({
          metric: "time_to_first_action",
          value_seconds: avg,
        });
      }
      if (resolutionDiffs.length > 0) {
        const avgRes =
          resolutionDiffs.reduce((a, b) => a + b, 0) / resolutionDiffs.length;
        average_processing_times.push({
          metric: "time_to_resolution",
          value_seconds: avgRes,
        });
      }
    }

    // Sanitize recent audits into lightweight summaries
    const sanitize = (payload: string | null | undefined): string => {
      if (!payload) return "";
      // redact email-like patterns and long hexs/ids, keep short text
      const redacted = payload.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        "[REDACTED]",
      );
      const trimmed = redacted.replace(/\s+/g, " ").trim();
      return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;
    };

    const recent_high_priority_audits = recentAudits.map((a) => ({
      id: a.id as string & tags.Format<"uuid">,
      event_type: a.event_type,
      occurred_at: toISOStringSafe(a.occurred_at),
      short_summary: sanitize(a.event_payload),
    }));

    return {
      pending_reports_24h: pending24,
      pending_reports_7d: pending7,
      actions_breakdown,
      average_processing_times,
      recent_high_priority_audits,
      generated_at: nowIso,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
