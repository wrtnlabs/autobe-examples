import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { IEDiscussionBoardAppealStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEDiscussionBoardAppealStatus";
import { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorAppeals(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardAppeal.IRequest;
}): Promise<IPageIDiscussionBoardAppeal.ISummary> {
  const { moderator, body } = props;

  // Pagination: defaults and limits
  const page = Number(body.page ?? 1);
  const requestedLimit = Number(body.limit ?? 20);
  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (requestedLimit < 1)
    throw new HttpException("Bad Request: limit must be >= 1", 400);
  if (requestedLimit > 200)
    throw new HttpException("Bad Request: limit exceeds maximum of 200", 400);
  const limit = Math.min(requestedLimit, 200);

  // Build where condition carefully (check undefined and null separately)
  const whereCondition: Record<string, unknown> = {
    // No global soft-delete field on appeals model per schema
  };

  if (body.status !== undefined && body.status !== null) {
    whereCondition.status = { in: body.status };
  }
  if (body.appellantMemberId !== undefined && body.appellantMemberId !== null) {
    whereCondition.appellant_member_id = body.appellantMemberId;
  }
  if (
    body.moderationActionId !== undefined &&
    body.moderationActionId !== null
  ) {
    whereCondition.moderation_action_id = body.moderationActionId;
  }
  if (body.reportId !== undefined && body.reportId !== null) {
    whereCondition.report_id = body.reportId;
  }

  if (
    (body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
  ) {
    const range: Record<string, unknown> = {};
    if (body.createdAtFrom !== undefined && body.createdAtFrom !== null)
      range.gte = body.createdAtFrom;
    if (body.createdAtTo !== undefined && body.createdAtTo !== null)
      range.lte = body.createdAtTo;
    whereCondition.created_at = range;
  }

  if (body.search !== undefined && body.search !== null) {
    whereCondition.explanation = { contains: body.search };
  }

  // Sorting
  const orderBy = (
    body.sort === "createdAt"
      ? ({ created_at: "asc" } as const)
      : ({ created_at: "desc" } as const)
  ) satisfies Prisma.discussion_board_appealsOrderByWithRelationInput;

  const useCursor = body.cursor !== undefined && body.cursor !== null;
  // Narrow cursor id to string because Prisma's cursor requires a definite id: string
  const cursor = useCursor ? { id: body.cursor as string } : undefined;
  const skip = useCursor ? 1 : (page - 1) * limit;

  // Fetch rows and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_appeals.findMany({
      where: whereCondition as any,
      include: {
        appellantMember: {
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        },
        moderationAction: {
          select: {
            id: true,
            action_type: true,
            action_reason: true,
            action_duration_days: true,
            target_type: true,
            target_id: true,
            created_at: true,
            effective_from: true,
            effective_until: true,
            moderator: {
              select: {
                id: true,
                username: true,
                display_name: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        report: {
          select: {
            id: true,
            reason_category: true,
            target_type: true,
            target_id: true,
            created_at: true,
            processed_at: true,
            closed_at: true,
          },
        },
      },
      orderBy,
      take: limit,
      skip,
      ...(useCursor ? { cursor } : {}),
    } as any),

    MyGlobal.prisma.discussion_board_appeals.count({
      where: whereCondition as any,
    }),
  ]);

  // Map to DTO summaries
  const data = rows.map((r) => {
    const appellant = (r as any).appellantMember
      ? {
          id: (r as any).appellantMember.id,
          username: (r as any).appellantMember.username,
          display_name: (r as any).appellantMember.display_name ?? null,
          created_at: toISOStringSafe((r as any).appellantMember.created_at),
        }
      : (null as any);

    const moderation_action = (r as any).moderationAction
      ? {
          id: (r as any).moderationAction.id,
          action_type: (r as any).moderationAction.action_type,
          action_reason: (r as any).moderationAction.action_reason ?? null,
          action_duration_days:
            (r as any).moderationAction.action_duration_days ?? null,
          target_type: (r as any).moderationAction.target_type ?? null,
          target_id: (r as any).moderationAction.target_id ?? null,
          moderator: (r as any).moderationAction.moderator
            ? {
                id: (r as any).moderationAction.moderator.id,
                username: (r as any).moderationAction.moderator.username,
                display_name:
                  (r as any).moderationAction.moderator.display_name ?? null,
                created_at: toISOStringSafe(
                  (r as any).moderationAction.moderator.created_at,
                ),
                updated_at: toISOStringSafe(
                  (r as any).moderationAction.moderator.updated_at,
                ),
                deleted_at: (r as any).moderationAction.moderator.deleted_at
                  ? toISOStringSafe(
                      (r as any).moderationAction.moderator.deleted_at,
                    )
                  : null,
              }
            : (null as any),
          created_at: toISOStringSafe((r as any).moderationAction.created_at),
          effective_from: (r as any).moderationAction.effective_from
            ? toISOStringSafe((r as any).moderationAction.effective_from)
            : null,
          effective_until: (r as any).moderationAction.effective_until
            ? toISOStringSafe((r as any).moderationAction.effective_until)
            : null,
        }
      : null;

    const report = (r as any).report
      ? {
          id: (r as any).report.id,
          reasonCategory: (r as any).report.reason_category,
          targetType: (r as any).report.target_type,
          targetId: (r as any).report.target_id,
          createdAt: toISOStringSafe((r as any).report.created_at),
          processedAt: (r as any).report.processed_at
            ? toISOStringSafe((r as any).report.processed_at)
            : null,
          closedAt: (r as any).report.closed_at
            ? toISOStringSafe((r as any).report.closed_at)
            : null,
          explanationExcerpt: (r as any).explanation
            ? (r as any).explanation.length > 500
              ? (r as any).explanation.slice(0, 500)
              : (r as any).explanation
            : null,
        }
      : null;

    return {
      id: (r as any).id,
      appellant: appellant as IDiscussionBoardMember.ISummary,
      status: (r as any).status as any,
      created_at: toISOStringSafe((r as any).created_at),
      resolved_at: (r as any).resolved_at
        ? toISOStringSafe((r as any).resolved_at)
        : null,
      moderation_action:
        moderation_action as unknown as IDiscussionBoardModerationAction.ISummary | null,
      report: report as unknown as IDiscussionBoardReport.ISummary | null,
      resolution_reason: (r as any).resolution_reason ?? null,
      explanation_excerpt: (r as any).explanation
        ? (r as any).explanation.length > 500
          ? (r as any).explanation.slice(0, 500)
          : (r as any).explanation
        : null,
    } satisfies IDiscussionBoardAppeal.ISummary;
  });

  // Audit: record the listing request
  const now = toISOStringSafe(new Date());
  const audit = await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "appeals.list",
      event_timestamp: now,
      actor_type: "moderator",
      actor_id: moderator.id,
      ip: null,
      user_agent: null,
      metadata: JSON.stringify({ query: body }),
      resource_type: null,
      resource_id: null,
      created_at: now,
      updated_at: now,
    },
    select: { id: true },
  });

  await MyGlobal.prisma.discussion_board_audit_log_accesses.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_audit_log_id: audit.id,
      accessed_at: now,
      accessor_type: "moderator",
      accessor_id: moderator.id,
      accessor_role: "moderator",
      access_purpose: "appeals.search",
      ip: null,
      user_agent: null,
      metadata: JSON.stringify({ query: body }),
      created_at: now,
    },
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
