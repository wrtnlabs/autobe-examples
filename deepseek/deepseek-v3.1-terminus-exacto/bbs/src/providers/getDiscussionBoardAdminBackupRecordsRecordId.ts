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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBackupRecordTransformer } from "../transformers/DiscussionBoardBackupRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminBackupRecordsRecordId(props: {
  admin: AdminPayload;
  recordId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBackupRecord> {
  const record =
    await MyGlobal.prisma.discussion_board_backup_records.findUnique({
      where: {
        id: props.recordId,
        deleted_at: null,
      },
      ...DiscussionBoardBackupRecordTransformer.select(),
    });
  if (!record) {
    throw new HttpException("Backup record not found", 404);
  }
  return await DiscussionBoardBackupRecordTransformer.transform(record);
}
