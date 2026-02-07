import { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
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

export async function putDiscussionBoardAdminBansBanRecordId(props: {
  admin: AdminPayload;
  banRecordId: string;
  body: IDiscussionBoardBansBanRecord.IUpdate;
}): Promise<IDiscussionBoardBansBanRecord> {
  const updated =
    await MyGlobal.prisma.discussion_board_bans_ban_records.update({
      where: {
        id: props.banRecordId,
      },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updated.id,
    user_id: updated.user_id,
    admin_id: updated.admin_id,
    reason: updated.reason,
    start_time: updated.start_time,
    end_time: updated.end_time,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at,
  };
}
