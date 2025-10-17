import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getEconPoliticalForumAdministratorModerationLogsLogId(props: {
  administrator: AdministratorPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumModerationLog> {
  const { administrator, logId } = props;

  // Authorization: ensure the administrator is enrolled and active
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });

  if (adminRecord === null) {
    throw new HttpException("Unauthorized", 403);
  }

  // Fetch moderation log entry; throw 404 when not found
  let record;
  try {
    record =
      await MyGlobal.prisma.econ_political_forum_moderation_logs.findUniqueOrThrow(
        {
          where: { id: logId },
        },
      );
  } catch (err) {
    throw new HttpException("Not Found", 404);
  }

  // Audit the access: record that an administrator viewed this moderation log
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      action_type: "view_moderation_log",
      target_type: "moderation_log",
      target_identifier: logId,
      details: JSON.stringify({
        accessed_by: "administrator",
        admin_registereduser_id: administrator.id,
        log_id: logId,
        evidence_reference: record.evidence_reference ?? null,
      }),
      created_at: now,
      created_by_system: false,
    },
  });

  // Convert Date fields and map nullable fields according to DTO expectations
  return {
    id: record.id as string & tags.Format<"uuid">,
    moderator_id:
      record.moderator_id === null
        ? null
        : (record.moderator_id as string & tags.Format<"uuid">),
    target_post_id:
      record.target_post_id === null
        ? null
        : (record.target_post_id as string & tags.Format<"uuid">),
    target_thread_id:
      record.target_thread_id === null
        ? null
        : (record.target_thread_id as string & tags.Format<"uuid">),
    moderation_case_id:
      record.moderation_case_id === null
        ? null
        : (record.moderation_case_id as string & tags.Format<"uuid">),
    acted_admin_id:
      record.acted_admin_id === null
        ? null
        : (record.acted_admin_id as string & tags.Format<"uuid">),
    action_type: record.action_type,
    reason_code: record.reason_code,
    rationale: record.rationale ?? null,
    evidence_reference: record.evidence_reference ?? null,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
