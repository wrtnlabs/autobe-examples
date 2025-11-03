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

export async function patchDiscussionBoardModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardReport.IRequest;
}): Promise<IPageIDiscussionBoardReport.ISummary> {
  const { moderator, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);

  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException(
      "Bad Request: limit must be between 1 and 100",
      400,
    );

  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.reasonCategory !== undefined &&
      body.reasonCategory !== null && { reason_category: body.reasonCategory }),
    ...(body.reporterMemberId !== undefined &&
      body.reporterMemberId !== null && {
        reporter_member_id: body.reporterMemberId,
      }),
    ...(body.targetType !== undefined &&
      body.targetType !== null && { target_type: body.targetType }),
    ...(body.targetId !== undefined &&
      body.targetId !== null && { target_id: body.targetId }),
    ...(body.includeClosed ? {} : { closed_at: null }),
    ...(body.search !== undefined &&
      body.search !== null && { explanation: { contains: body.search } }),
  };

  if (
    (body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
  ) {
    (whereCondition as any).created_at = {
      ...(body.createdFrom !== undefined &&
        body.createdFrom !== null && { gte: body.createdFrom }),
      ...(body.createdTo !== undefined &&
        body.createdTo !== null && { lte: body.createdTo }),
    };
  }
  if (
    (body.processedFrom !== undefined && body.processedFrom !== null) ||
    (body.processedTo !== undefined && body.processedTo !== null)
  ) {
    (whereCondition as any).processed_at = {
      ...(body.processedFrom !== undefined &&
        body.processedFrom !== null && { gte: body.processedFrom }),
      ...(body.processedTo !== undefined &&
        body.processedTo !== null && { lte: body.processedTo }),
    };
  }

  let orderBy: Record<string, "asc" | "desc"> | undefined = undefined;
  if (body.sortBy) {
    switch (body.sortBy) {
      case "createdAt":
        orderBy = { created_at: "asc" };
        break;
      case "-createdAt":
        orderBy = { created_at: "desc" };
        break;
      case "processedAt":
        orderBy = { processed_at: "asc" };
        break;
      case "-processedAt":
        orderBy = { processed_at: "desc" };
        break;
      case "priority":
        orderBy = { created_at: "desc" };
        break;
      default:
        throw new HttpException("Bad Request: unsupported sort token", 400);
    }
  } else {
    orderBy = { created_at: "desc" };
  }

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_reports.findMany({
        where: whereCondition,
        orderBy,
        skip,
        take: limit,
      }),
      MyGlobal.prisma.discussion_board_reports.count({ where: whereCondition }),
    ]);

    const reporterMap = new Map<string, IDiscussionBoardMember.ISummary>();
    if (body.includeReporterContext) {
      const reporterIds = Array.from(
        new Set(
          rows.map((r) => r.reporter_member_id).filter((x) => x !== null),
        ),
      ) as string[];
      if (reporterIds.length > 0) {
        const members = await MyGlobal.prisma.discussion_board_member.findMany({
          where: { id: { in: reporterIds } },
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        });
        for (const m of members) {
          reporterMap.set(m.id, {
            id: m.id as string & tags.Format<"uuid">,
            username: m.username,
            display_name: m.display_name === null ? null : m.display_name,
            created_at: toISOStringSafe(m.created_at),
          });
        }
      }
    }

    const data: IDiscussionBoardReport.ISummary[] = rows.map((r) => {
      const reporterMemberId =
        r.reporter_member_id === null
          ? null
          : (r.reporter_member_id as string & tags.Format<"uuid">);
      return {
        id: r.id as string & tags.Format<"uuid">,
        reporterMemberId: reporterMemberId,
        reporter: reporterMap.get(r.reporter_member_id ?? "") ?? undefined,
        reasonCategory:
          r.reason_category as IDiscussionBoardReportReasonCategory,
        targetType: r.target_type,
        targetId: r.target_id as string & tags.Format<"uuid">,
        status: r.status as IDiscussionBoardReportStatus,
        createdAt: toISOStringSafe(r.created_at),
        processedAt: r.processed_at ? toISOStringSafe(r.processed_at) : null,
        closedAt: r.closed_at ? toISOStringSafe(r.closed_at) : null,
        explanationExcerpt: r.explanation ? r.explanation.slice(0, 500) : null,
        reportCount: null,
        uniqueReporterCount: null,
      };
    });

    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_moderator_id: moderator.id,
        event_type: "report.search",
        event_payload: JSON.stringify({
          query: {
            page,
            limit,
            status: body.status ?? null,
            reasonCategory: body.reasonCategory ?? null,
            targetType: body.targetType ?? null,
            targetId: body.targetId ?? null,
            search: body.search ?? null,
            includeReporterContext: !!body.includeReporterContext,
          },
        }),
        occurred_at: toISOStringSafe(new Date()),
      },
    });

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (err) {
    const correlation = v4() as string & tags.Format<"uuid">;
    try {
      await MyGlobal.prisma.discussion_board_moderation_audit.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_moderator_id: moderator.id,
          event_type: "report.search.error",
          event_payload: JSON.stringify({ error: String(err), correlation }),
          occurred_at: toISOStringSafe(new Date()),
        },
      });
    } catch (_) {
      // swallow
    }
    throw new HttpException(`Service Unavailable: ${correlation}`, 503);
  }
}
