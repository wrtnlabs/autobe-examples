import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminBackupRecordsBackupRecordId(props: {
  superAdmin: SuperAdminPayload;
  backupRecordId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify backup record exists - findUniqueOrThrow will automatically throw 404 if not found
  await MyGlobal.prisma.discussion_board_backup_records.findUniqueOrThrow({
    where: { id: props.backupRecordId },
  });
  // Perform hard delete (permanent removal from database)
  await MyGlobal.prisma.discussion_board_backup_records.delete({
    where: { id: props.backupRecordId },
  });
}
