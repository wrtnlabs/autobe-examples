import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanRecordCollector } from "../collectors/DiscussionBoardBanRecordCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.ICreate;
}): Promise<IDiscussionBoardBanRecord> {
  const created = await MyGlobal.prisma.discussion_board_ban_records.create({
    data: await DiscussionBoardBanRecordCollector.collect({
      body: props.body,
      administrator: props.admin,
    }),
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  return await DiscussionBoardBanRecordTransformer.transform(created);
}
