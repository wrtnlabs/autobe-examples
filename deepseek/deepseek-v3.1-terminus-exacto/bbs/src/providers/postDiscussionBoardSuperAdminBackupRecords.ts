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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBackupRecordTransformer } from "../transformers/DiscussionBoardBackupRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminBackupRecords(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBackupRecord.ICreate;
}): Promise<IDiscussionBoardBackupRecord> {
  const created = await MyGlobal.prisma.discussion_board_backup_records.create({
    data: await DiscussionBoardBackupRecordCollector.collect({
      body: props.body,
    }),
    ...DiscussionBoardBackupRecordTransformer.select(),
  });
  return await DiscussionBoardBackupRecordTransformer.transform(created);
}
