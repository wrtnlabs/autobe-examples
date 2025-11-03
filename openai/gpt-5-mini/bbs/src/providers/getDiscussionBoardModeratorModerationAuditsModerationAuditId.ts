import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAudit";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModerationAuditsModerationAuditId(props: {
  moderator: ModeratorPayload;
  moderationAuditId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAudit> {
  const { moderator, moderationAuditId } = props;

  // Fetch the moderation audit entry by primary key
  const record =
    await MyGlobal.prisma.discussion_board_moderation_audit.findUnique({
      where: { id: moderationAuditId },
    });

  if (!record) {
    throw new HttpException("Not Found", 404);
  }

  // Prepare timestamp for audit recording
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Record a generic audit-log entry describing this access
  const createdAuditLog =
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "moderation_audit.access",
        event_timestamp: now,
        resource_type: "moderation_audit",
        resource_id: record.id,
        actor_type: "moderator",
        actor_id: moderator.id,
        ip: null,
        user_agent: null,
        metadata: JSON.stringify({ access_purpose: "investigation" }),
        created_at: now,
        updated_at: now,
      },
    });

  // Record the access details referencing the audit log
  await MyGlobal.prisma.discussion_board_audit_log_accesses.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_audit_log_id: createdAuditLog.id,
      accessed_at: now,
      accessor_type: "moderator",
      accessor_id: moderator.id,
      accessor_role: "moderator",
      access_purpose: "investigation",
      ip: null,
      user_agent: null,
      metadata: null,
      created_at: now,
    },
  });

  // Redact sensitive information from event_payload for standard moderators
  let eventPayload: string = record.event_payload;
  try {
    const parsed = JSON.parse(record.event_payload);
    if (parsed && typeof parsed === "object") {
      const redacted = { ...parsed } as Record<string, unknown>;
      const sensitiveKeys = [
        "email",
        "ip",
        "ip_address",
        "request_ip",
        "reporter_email",
        "reporter_ip",
        "session",
        "token",
        "authorization",
        "password",
        "ssn",
        "user_agent",
        "cookie",
        "phone",
      ];

      for (const k of sensitiveKeys) {
        if (Object.prototype.hasOwnProperty.call(redacted, k)) {
          redacted[k] = "[REDACTED]";
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(redacted, "reporter") &&
        redacted.reporter &&
        typeof redacted.reporter === "object"
      ) {
        const rep = { ...(redacted.reporter as Record<string, unknown>) };
        for (const k of sensitiveKeys) {
          if (Object.prototype.hasOwnProperty.call(rep, k))
            rep[k] = "[REDACTED]";
        }
        redacted.reporter = rep;
      }

      eventPayload = JSON.stringify(redacted);
    }
  } catch {
    // Fallback: redact obvious email addresses and IPv4 addresses using regex
    eventPayload = record.event_payload
      .replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        "[REDACTED]",
      )
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[REDACTED]");
  }

  // Map DB fields (snake_case) to API DTO (camelCase) with correct null handling
  return {
    id: record.id as string & tags.Format<"uuid">,
    moderationActionId: record.moderation_action_id ?? null,
    reportId: record.report_id ?? null,
    actorModeratorId: record.actor_moderator_id ?? null,
    actorModerator: undefined,
    eventType: record.event_type,
    eventPayload,
    occurredAt: toISOStringSafe(record.occurred_at),
  };
}
