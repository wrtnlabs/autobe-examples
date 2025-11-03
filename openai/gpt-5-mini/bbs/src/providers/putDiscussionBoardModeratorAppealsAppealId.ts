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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putDiscussionBoardModeratorAppealsAppealId(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAppeal.IUpdate;
}): Promise<IDiscussionBoardAppeal> {
  const { moderator, appealId, body } = props;

  // Fetch existing appeal (throws if not found)
  const existing =
    await MyGlobal.prisma.discussion_board_appeals.findUniqueOrThrow({
      where: { id: appealId },
    });

  // STATUS TRANSITION VALIDATION
  if (body.status !== undefined && body.status !== null) {
    if (
      (existing.status === "accepted" || existing.status === "rejected") &&
      body.status === "pending"
    ) {
      throw new HttpException(
        "Invalid status transition: cannot revert resolved appeal to pending",
        400,
      );
    }
  }

  // MODERATION ACTION REFERENTIAL CHECK
  if (
    body.moderationActionId !== undefined &&
    body.moderationActionId !== null
  ) {
    const modAction =
      await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
        where: { id: body.moderationActionId },
      });
    if (!modAction) {
      throw new HttpException("Moderation action not found", 404);
    }

    // If both the appeal and moderation action reference a report, they must match
    if (
      existing.report_id &&
      modAction.discussion_board_report_id &&
      modAction.discussion_board_report_id !== existing.report_id
    ) {
      throw new HttpException(
        "Conflict: moderation action does not reference the same report as the appeal",
        409,
      );
    }
  }

  // RESOLVED_AT CHRONOLOGY VALIDATION
  if (body.resolvedAt !== undefined && body.resolvedAt !== null) {
    // created_at from Prisma is a Date | string handled by toISOStringSafe
    const createdIso = toISOStringSafe(existing.created_at);
    const provided = body.resolvedAt;
    const createdMs = Date.parse(createdIso);
    const providedMs = Date.parse(provided);
    if (Number.isNaN(providedMs)) {
      throw new HttpException(
        "resolvedAt must be a valid ISO 8601 datetime string",
        400,
      );
    }
    if (providedMs < createdMs) {
      throw new HttpException(
        "resolvedAt must not be earlier than appeal.created_at",
        400,
      );
    }
  }

  // PERFORM UPDATE - inline data object with conditional fields
  const updated = await MyGlobal.prisma.discussion_board_appeals.update({
    where: { id: appealId },
    data: {
      // status is required in DB; if caller provided null, treat as "no-op" (skip)
      ...(body.status !== undefined && body.status !== null
        ? { status: body.status }
        : {}),

      // resolution_reason is nullable; preserve explicit null when provided
      ...(body.resolutionReason !== undefined
        ? { resolution_reason: body.resolutionReason }
        : {}),

      // resolved_at is nullable date-time; convert when non-null
      ...(body.resolvedAt !== undefined
        ? {
            resolved_at:
              body.resolvedAt === null
                ? null
                : toISOStringSafe(body.resolvedAt),
          }
        : {}),

      // moderation_action_id is nullable FK; preserve explicit null when provided
      ...(body.moderationActionId !== undefined
        ? {
            moderation_action_id:
              body.moderationActionId === null ? null : body.moderationActionId,
          }
        : {}),
    },
  });

  // BUILD AUDIT ENTRY: capture before and after snapshots (stringify-safe)
  const before = {
    id: existing.id,
    appellant_member_id: existing.appellant_member_id,
    moderation_action_id:
      existing.moderation_action_id === null
        ? undefined
        : existing.moderation_action_id,
    report_id: existing.report_id === null ? undefined : existing.report_id,
    explanation: existing.explanation,
    status: existing.status,
    created_at: toISOStringSafe(existing.created_at),
    resolved_at: existing.resolved_at
      ? toISOStringSafe(existing.resolved_at)
      : null,
    resolution_reason:
      existing.resolution_reason === null
        ? undefined
        : existing.resolution_reason,
  };

  const after = {
    id: updated.id,
    appellant_member_id: updated.appellant_member_id,
    moderation_action_id:
      updated.moderation_action_id === null
        ? undefined
        : updated.moderation_action_id,
    report_id: updated.report_id === null ? undefined : updated.report_id,
    explanation: updated.explanation,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
    resolution_reason:
      updated.resolution_reason === null
        ? undefined
        : updated.resolution_reason,
  };

  await MyGlobal.prisma.discussion_board_moderation_audit.create({
    data: {
      id: v4(),
      moderation_action_id: updated.moderation_action_id ?? null,
      report_id: updated.report_id ?? null,
      actor_moderator_id: moderator.id,
      event_type: "appeal.updated",
      event_payload: JSON.stringify({ before, after }),
      // Use existing created_at as the audit occurred_at timestamp because updated.updated_at is not present on the returned type
      occurred_at: toISOStringSafe(updated.created_at),
    },
  });

  // MAP DB ROW TO API RETURN TYPE (respecting null vs undefined rules)
  return {
    id: updated.id,
    appellant_member_id: updated.appellant_member_id,
    moderation_action_id:
      updated.moderation_action_id === null
        ? undefined
        : updated.moderation_action_id,
    report_id: updated.report_id === null ? undefined : updated.report_id,
    explanation: updated.explanation,
    status: typia.assert<IEDiscussionBoardAppealStatus>(updated.status),
    created_at: toISOStringSafe(updated.created_at),
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
    resolution_reason:
      updated.resolution_reason === null
        ? undefined
        : updated.resolution_reason,
  };
}
