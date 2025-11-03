import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAudit";
import { IPageIDiscussionBoardModerationAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAudit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationAudits(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAudit.IRequest;
}): Promise<IPageIDiscussionBoardModerationAudit.ISummary> {
  const { moderator, body } = props;

  // Authorization contract: ensure moderator payload is present
  if (!moderator || !moderator.id) throw new HttpException("Unauthorized", 401);

  // Pagination defaults and safe coercion for branded numbers
  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  // Determine order literal inline
  const orderBy =
    body.sort === "occurredAt"
      ? { occurred_at: "asc" as const }
      : { occurred_at: "desc" as const };

  try {
    // Build where condition inline with explicit null checks for required Prisma compatibility
    const whereCondition = {
      ...(body.eventType !== undefined &&
        body.eventType !== null && { event_type: body.eventType }),
      ...(body.moderationActionId !== undefined &&
        body.moderationActionId !== null && {
          moderation_action_id: body.moderationActionId,
        }),
      ...(body.reportId !== undefined &&
        body.reportId !== null && { report_id: body.reportId }),
      ...(body.actorModeratorId !== undefined &&
        body.actorModeratorId !== null && {
          actor_moderator_id: body.actorModeratorId,
        }),
      ...((body.occurredFrom !== undefined && body.occurredFrom !== null) ||
      (body.occurredTo !== undefined && body.occurredTo !== null)
        ? {
            occurred_at: {
              ...(body.occurredFrom !== undefined &&
                body.occurredFrom !== null && {
                  gte: toISOStringSafe(body.occurredFrom),
                }),
              ...(body.occurredTo !== undefined &&
                body.occurredTo !== null && {
                  lte: toISOStringSafe(body.occurredTo),
                }),
            },
          }
        : {}),
      ...(body.textSearch !== undefined &&
        body.textSearch !== null && {
          event_payload: { contains: body.textSearch },
        }),
    };

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_moderation_audit.findMany({
        where: whereCondition,
        orderBy: orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          moderation_action_id: true,
          report_id: true,
          actor_moderator_id: true,
          event_type: true,
          event_payload: true,
          occurred_at: true,
        },
      }),
      MyGlobal.prisma.discussion_board_moderation_audit.count({
        where: whereCondition,
      }),
    ]);

    // Map DB rows to DTO summaries with careful null/undefined handling
    const data: IDiscussionBoardModerationAudit.ISummary[] = rows.map((r) => {
      const snippet = r.event_payload
        ? String(r.event_payload).slice(0, 200)
        : null;

      return {
        id: r.id,
        event_type: r.event_type,
        occurred_at: toISOStringSafe(r.occurred_at),
        actor_moderator_id:
          r.actor_moderator_id === null ? null : r.actor_moderator_id,
        actor_moderator: null,
        moderation_action: null,
        report: null,
        event_payload_snippet: snippet === null ? null : snippet,
      };
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
  } catch (error) {
    // Provide correlation id when available
    const correlation = (error && (error as any).correlationId) || v4();
    throw new HttpException(`Internal Server Error: ${correlation}`, 500);
  }
}
