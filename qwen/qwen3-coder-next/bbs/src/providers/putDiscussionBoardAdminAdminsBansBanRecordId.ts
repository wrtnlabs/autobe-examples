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

export async function putDiscussionBoardAdminAdminsBansBanRecordId(props: {
  admin: AdminPayload;
  banRecordId: string;
  body: IDiscussionBoardBansBanRecord.IUpdate;
}): Promise<IDiscussionBoardBansBanRecord> {
  const existing =
    await MyGlobal.prisma.discussion_board_bans_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!existing) throw new HttpException("Ban record not found", 404);
  const updated =
    await MyGlobal.prisma.discussion_board_bans_ban_records.update({
      where: { id: props.banRecordId },
      data: {
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  return {
    id: updated.id,
    reason: updated.reason,
    start_time: updated.start_time,
    end_time: updated.end_time === null ? undefined : updated.end_time,
    admin_id: updated.admin_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
