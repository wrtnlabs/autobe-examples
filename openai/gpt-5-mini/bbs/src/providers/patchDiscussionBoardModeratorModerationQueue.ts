import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationQueue(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardReport.IRequest;
}): Promise<IPageIDiscussionBoardReport.ISummary> {
  const { moderator, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (body.status !== undefined) where.status = body.status;
  if (body.reasonCategory !== undefined && body.reasonCategory !== null)
    where.reason_category = body.reasonCategory;
  if (body.targetType !== undefined && body.targetType !== null)
    where.target_type = body.targetType;
  if (body.targetId !== undefined && body.targetId !== null)
    where.target_id = body.targetId;
  if (!body.includeProcessed) (where as any).processed_at = null;

  if (
    (body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
  ) {
    (where as any).created_at = {
      ...(body.createdFrom !== undefined &&
        body.createdFrom !== null && { gte: body.createdFrom }),
      ...(body.createdTo !== undefined &&
        body.createdTo !== null && { lte: body.createdTo }),
    };
  }

  let groupOrderBy: any;
  switch (body.sortBy) {
    case "createdAt":
      groupOrderBy = { _max: { created_at: "asc" } };
      break;
    case "-createdAt":
      groupOrderBy = { _max: { created_at: "desc" } };
      break;
    case "processedAt":
      groupOrderBy = { _max: { processed_at: "asc" } };
      break;
    case "-processedAt":
      groupOrderBy = { _max: { processed_at: "desc" } };
      break;
    case "priority":
      groupOrderBy = { _count: { _all: "desc" } };
      break;
    default:
      groupOrderBy = { _max: { created_at: "desc" } };
  }

  try {
    // Cast the groupBy argument to any to avoid complex Prisma overload issues,
    // then cast the returned value to a simple local shape for safe property access.
    const allGroups = (await MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["target_type", "target_id"],
      where,
      _count: { _all: true },
    } as unknown as any)) as Array<{
      target_type: string;
      target_id: string;
      _count?: { _all?: number } | null;
    }>;

    const total = allGroups.length;

    if (total === 0) {
      return {
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }

    const groups = (await MyGlobal.prisma.discussion_board_reports.groupBy({
      by: ["target_type", "target_id"],
      where,
      _count: { _all: true },
      _max: { created_at: true, processed_at: true },
      orderBy: groupOrderBy,
      skip,
      take: limit,
    } as unknown as any)) as Array<{
      target_type: string;
      target_id: string;
      _count?: { _all?: number } | null;
      _max?: {
        created_at?: Date | string | null;
        processed_at?: Date | string | null;
      } | null;
    }>;

    const data: IDiscussionBoardReport.ISummary[] = [];

    for (const g of groups) {
      const rep = await MyGlobal.prisma.discussion_board_reports.findFirst({
        where: {
          target_type: g.target_type,
          target_id: g.target_id,
        },
        orderBy: { created_at: "desc" },
      });

      if (!rep) continue;

      let reporterSummary: IDiscussionBoardMember.ISummary | undefined =
        undefined;
      if (body.includeReporterContext) {
        if (rep.reporter_member_id) {
          const reporter =
            await MyGlobal.prisma.discussion_board_member.findUnique({
              where: { id: rep.reporter_member_id },
              select: {
                id: true,
                username: true,
                display_name: true,
                created_at: true,
              },
            });

          if (reporter) {
            reporterSummary = {
              id: reporter.id,
              username: reporter.username,
              display_name: reporter.display_name ?? null,
              created_at: toISOStringSafe(reporter.created_at),
            };
          }
        }

        // Record access in moderation audit trail using existing fields
        try {
          await MyGlobal.prisma.discussion_board_moderation_audit.create({
            data: {
              id: v4(),
              report_id: rep.id,
              actor_moderator_id: moderator.id,
              event_type: "moderation.report_access",
              event_payload: JSON.stringify({
                target_type: g.target_type,
                target_id: g.target_id,
                includeReporterContext: true,
              }),
              occurred_at: toISOStringSafe(new Date()),
            },
          });
        } catch (_) {
          // best-effort audit logging
        }
      }

      const summary: IDiscussionBoardReport.ISummary = {
        id: rep.id,
        reporterMemberId: rep.reporter_member_id ?? null,
        reporter: reporterSummary,
        reasonCategory:
          rep.reason_category as IDiscussionBoardReportReasonCategory,
        targetType: rep.target_type,
        targetId: rep.target_id,
        status: rep.status as IDiscussionBoardReportStatus,
        createdAt: toISOStringSafe(rep.created_at),
        processedAt: rep.processed_at
          ? toISOStringSafe(rep.processed_at)
          : null,
        closedAt: rep.closed_at ? toISOStringSafe(rep.closed_at) : null,
        explanationExcerpt: rep.explanation
          ? rep.explanation.slice(0, 500)
          : null,
        reportCount: g._count?._all ?? 0,
        uniqueReporterCount: null,
      };

      data.push(summary);
    }

    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
