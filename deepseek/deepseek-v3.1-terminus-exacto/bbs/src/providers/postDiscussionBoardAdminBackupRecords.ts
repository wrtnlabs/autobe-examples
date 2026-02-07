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
import { DiscussionBoardBackupRecordCollector } from "../collectors/DiscussionBoardBackupRecordCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBackupRecordTransformer } from "../transformers/DiscussionBoardBackupRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminBackupRecords(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBackupRecord.ICreate;
}): Promise<IDiscussionBoardBackupRecord> {
  try {
    const created =
      await MyGlobal.prisma.discussion_board_backup_records.create({
        data: await DiscussionBoardBackupRecordCollector.collect({
          body: props.body,
        }),
        ...DiscussionBoardBackupRecordTransformer.select(),
      });
    return await DiscussionBoardBackupRecordTransformer.transform(created);
  } catch (error) {
    // Handle foreign key constraint violations
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpException("Referenced admin not found", 404);
    }
    throw error;
  }
}
