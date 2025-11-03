import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IUpdate;
}): Promise<IDiscussionBoardReport> {
  const { moderator, reportId, body } = props;

  // Authorization: ensure moderator session is valid and moderator not deleted
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: moderator.session_id,
        discussion_board_moderator_id: moderator.id,
        expired_at: null,
        moderator: { deleted_at: null },
      },
    });
  if (!session)
    throw new HttpException("Unauthorized: invalid moderator session", 403);

  // Validate allowed status values (business rule)
  const allowedStatuses = ["pending", "triaged", "resolved"] as const;
  if (body.status !== undefined && !allowedStatuses.includes(body.status)) {
    throw new HttpException("Bad Request: invalid status value", 400);
  }

  // Fetch existing report
  const existing = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: { id: reportId },
  });
  if (!existing) throw new HttpException("Not Found", 404);

  // Validate provided timestamps (must be ISO 8601 and chronological)
  if (body.processed_at !== undefined && body.processed_at !== null) {
    const parsedProcessed = Date.parse(body.processed_at);
    if (Number.isNaN(parsedProcessed)) {
      throw new HttpException(
        "Bad Request: processed_at must be ISO 8601",
        400,
      );
    }
    if (
      parsedProcessed <
      Date.parse(toISOStringSafe(existing.created_at as unknown as string))
    ) {
      throw new HttpException(
        "Bad Request: processed_at cannot be earlier than created_at",
        400,
      );
    }
  }

  if (body.closed_at !== undefined && body.closed_at !== null) {
    const parsedClosed = Date.parse(body.closed_at);
    if (Number.isNaN(parsedClosed)) {
      throw new HttpException("Bad Request: closed_at must be ISO 8601", 400);
    }
    if (
      parsedClosed <
      Date.parse(toISOStringSafe(existing.created_at as unknown as string))
    ) {
      throw new HttpException(
        "Bad Request: closed_at cannot be earlier than created_at",
        400,
      );
    }
    const processedReference =
      body.processed_at !== undefined && body.processed_at !== null
        ? Date.parse(body.processed_at)
        : existing.processed_at
          ? Date.parse(
              toISOStringSafe(existing.processed_at as unknown as string),
            )
          : null;
    if (processedReference !== null && parsedClosed < processedReference) {
      throw new HttpException(
        "Bad Request: closed_at cannot be earlier than processed_at",
        400,
      );
    }
  }

  // Prepare values for update using toISOStringSafe (null-checked)
  const processedAtValue =
    body.processed_at === undefined
      ? undefined
      : body.processed_at === null
        ? null
        : toISOStringSafe(body.processed_at);

  let closedAtValue: (string & tags.Format<"date-time">) | null | undefined =
    body.closed_at === undefined
      ? undefined
      : body.closed_at === null
        ? null
        : toISOStringSafe(body.closed_at);

  // If status changes to resolved and closed_at not explicitly provided, set now
  if (body.status === "resolved" && body.closed_at === undefined) {
    closedAtValue = toISOStringSafe(new Date() as unknown as string);
  }

  // Inline update per Prisma guidance
  const updated = await MyGlobal.prisma.discussion_board_reports.update({
    where: { id: reportId },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.processed_at !== undefined && {
        processed_at: processedAtValue,
      }),
      ...((body.closed_at !== undefined ||
        (body.status === "resolved" && closedAtValue !== undefined)) && {
        closed_at: closedAtValue,
      }),
    },
  });

  // Append audit entry for moderation changes
  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4(),
      report_id: reportId,
      actor_moderator_id: moderator.id,
      event_type: "moderation.report.updated",
      event_payload: JSON.stringify({
        before: {
          id: existing.id,
          status: existing.status,
          processed_at: existing.processed_at
            ? toISOStringSafe(existing.processed_at as unknown as string)
            : null,
          closed_at: existing.closed_at
            ? toISOStringSafe(existing.closed_at as unknown as string)
            : null,
        },
        after: {
          id: updated.id,
          status: updated.status,
          processed_at: updated.processed_at
            ? toISOStringSafe(updated.processed_at as unknown as string)
            : null,
          closed_at: updated.closed_at
            ? toISOStringSafe(updated.closed_at as unknown as string)
            : null,
        },
        actor: moderator.id,
      }),
      occurred_at: toISOStringSafe(new Date() as unknown as string),
    },
  });

  // Build response and redact sensitive session-level data (reporter_session_id omitted)
  const response = {
    id: updated.id,
    reporter_member_id: updated.reporter_member_id,
    target_type: updated.target_type,
    target_id: updated.target_id,
    reason_category: typia.assert<IDiscussionBoardReportReasonCategory>(
      updated.reason_category,
    ),
    explanation: updated.explanation ?? null,
    status: typia.assert<IDiscussionBoardReportStatus>(updated.status),
    created_at: toISOStringSafe(updated.created_at as unknown as string),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at as unknown as string)
      : null,
    closed_at: updated.closed_at
      ? toISOStringSafe(updated.closed_at as unknown as string)
      : null,
  } satisfies IDiscussionBoardReport;

  return response;
}
