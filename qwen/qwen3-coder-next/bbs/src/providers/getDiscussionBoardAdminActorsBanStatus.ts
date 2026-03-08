import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanRecordAtStatusTransformer } from "../transformers/DiscussionBoardBanRecordAtStatusTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminActorsBanStatus(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardBanRecord.IStatus> {
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findFirst({
      where: {
        discussion_board_member_id: props.admin.id,
        unbanned_at: null,
        deleted_at: null,
      },
      ...DiscussionBoardBanRecordAtStatusTransformer.select(),
    });
  if (!banRecord) {
    return {
      is_banned: false,
      banned_at: new Date().toISOString() as string & tags.Format<"date-time">,
    };
  }
  return await DiscussionBoardBanRecordAtStatusTransformer.transform(banRecord);
}
