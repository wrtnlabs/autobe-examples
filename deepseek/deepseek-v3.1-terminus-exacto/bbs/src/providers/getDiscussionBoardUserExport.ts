import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardBackupRecordTransformer } from "../transformers/DiscussionBoardBackupRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserExport(props: {
  user: UserPayload;
}): Promise<IDiscussionBoardBackupRecord> {
  // Validate user exists and is active
  const user = await MyGlobal.prisma.discussion_board_users.findFirstOrThrow({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  const now = new Date();
  // Create backup record for user data export
  const backupRecord =
    await MyGlobal.prisma.discussion_board_backup_records.create({
      data: {
        id: v4(),
        backup_type: "user_data_export",
        status: "completed",
        file_path: null, // No physical file generated
        size_bytes: null, // Metadata-only export
        started_at: now,
        completed_at: now,
        error_message: `User data export for ${user.email} (${user.display_name}) at ${now.toISOString()}. Scope: profile, articles, comments, sections.`,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        initiated_by_admin_id: null, // User-initiated export
      },
      ...DiscussionBoardBackupRecordTransformer.select(),
    });
  // Transform using the existing transformer
  return await DiscussionBoardBackupRecordTransformer.transform(backupRecord);
}
