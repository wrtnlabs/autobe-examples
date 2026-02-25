import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminBackupRecordsBackupRecordId(props: {
  admin: AdminPayload;
  backupRecordId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify backup record exists and is not already deleted
  const backupRecord =
    await MyGlobal.prisma.discussion_board_backup_records.findUniqueOrThrow({
      where: {
        id: props.backupRecordId,
        deleted_at: null,
      },
    });
  // Check authorization - if backup was initiated by an admin, verify it's the same admin
  // Automated backups (null initiated_by_admin_id) can be deleted by any admin
  if (
    backupRecord.initiated_by_admin_id &&
    backupRecord.initiated_by_admin_id !== props.admin.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Get current timestamp as ISO string for soft delete
  const currentTimestamp = toISOStringSafe(new Date());
  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_backup_records.update({
    where: { id: props.backupRecordId },
    data: {
      deleted_at: currentTimestamp,
      updated_at: currentTimestamp,
    },
  });
}
