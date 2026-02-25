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

export async function getDiscussionBoardAdminBackupRecordsBackupRecordId(props: {
  admin: AdminPayload;
  backupRecordId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBackupRecord> {
  const backupRecord =
    await MyGlobal.prisma.discussion_board_backup_records.findUniqueOrThrow({
      where: {
        id: props.backupRecordId,
        deleted_at: null,
      },
      ...DiscussionBoardBackupRecordTransformer.select(),
    });
  return await DiscussionBoardBackupRecordTransformer.transform(backupRecord);
}
