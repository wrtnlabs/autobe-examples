import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuditLogAccess } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLogAccess";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorAuditLogAccessesAuditLogAccessId(props: {
  moderator: ModeratorPayload;
  auditLogAccessId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLogAccess> {
  const { moderator, auditLogAccessId } = props;

  // Authorization: verify moderator still active
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUniqueOrThrow({
      where: { id: moderator.id },
      select: { id: true, deleted_at: true },
    });

  if (moderatorRecord.deleted_at) {
    throw new HttpException("Unauthorized: moderator account suspended", 403);
  }

  // Retrieve the audit-log-access record
  const record =
    await MyGlobal.prisma.discussion_board_audit_log_accesses.findUnique({
      where: { id: auditLogAccessId },
    });

  if (!record) throw new HttpException("Not Found", 404);

  // Enforce policy: do not reveal soft-deleted access records to standard moderators
  if (record.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  // Map DB row to API DTO, converting Date -> ISO strings safely
  const response: IDiscussionBoardAuditLogAccess = {
    id: record.id as string & tags.Format<"uuid">,
    auditLogId: record.discussion_board_audit_log_id as string &
      tags.Format<"uuid">,
    accessedAt: toISOStringSafe(record.accessed_at),
    accessorType: record.accessor_type as
      | "moderator"
      | "administrator"
      | "system"
      | "guest",
    // Optional/nullable fields - preserve null from DB, otherwise provide value
    accessorId: record.accessor_id ?? null,
    accessorRole: record.accessor_role ?? null,
    accessPurpose: record.access_purpose ?? null,
    ip: record.ip ?? null,
    userAgent: record.user_agent ?? null,
    metadata: record.metadata ?? null,
    createdAt: toISOStringSafe(record.created_at),
    // deletedAt is optional+nullable in DTO; prefer undefined when not present
    deletedAt: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };

  return response;
}
