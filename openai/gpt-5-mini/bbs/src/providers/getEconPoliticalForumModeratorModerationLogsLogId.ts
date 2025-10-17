import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconPoliticalForumModeratorModerationLogsLogId(props: {
  moderator: ModeratorPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumModerationLog> {
  const { moderator, logId } = props;

  // Authorization: verify moderator existence and active status
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });

  if (!moderatorRecord) {
    throw new HttpException("Unauthorized: moderator access required", 403);
  }

  // Retrieve the moderation log
  const record =
    await MyGlobal.prisma.econ_political_forum_moderation_logs.findUnique({
      where: { id: logId },
    });

  if (!record) throw new HttpException("Not Found", 404);

  // Moderators must not see soft-deleted entries
  if (record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Redact/truncate sensitive text fields for moderator view
  const redactOrTruncate = (
    value: string | null | undefined,
  ): string | null => {
    if (value === null || value === undefined) return null;
    return value.length > 256 ? value.slice(0, 256) : value;
  };

  const rationale = redactOrTruncate(record.rationale);
  const evidence_reference = redactOrTruncate(record.evidence_reference);

  return {
    id: record.id as string & tags.Format<"uuid">,
    moderator_id: record.moderator_id ?? null,
    target_post_id: record.target_post_id ?? null,
    target_thread_id: record.target_thread_id ?? null,
    moderation_case_id: record.moderation_case_id ?? null,
    acted_admin_id: record.acted_admin_id ?? null,
    action_type: record.action_type,
    reason_code: record.reason_code,
    rationale,
    evidence_reference,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
