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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminBansBanId(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  const updated = await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banId },
    data: {
      ban_reason: props.body.ban_reason,
      unban_reason: props.body.unban_reason,
      unbanned_at: props.body.unban_reason !== undefined ? new Date() : null,
      updated_at: new Date(),
    },
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  return await DiscussionBoardBanRecordTransformer.transform(updated);
}
