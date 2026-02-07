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

export async function getDiscussionBoardAdminBansBanRecordId(props: {
  admin: AdminPayload;
  banRecordId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBansBanRecord> {
  const record =
    await MyGlobal.prisma.discussion_board_bans_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!record) throw new HttpException("Ban record not found", 404);
  return {
    id: record.id,
    user_id: record.user_id,
    admin_id: record.admin_id,
    reason: record.reason,
    start_time: toISOStringSafe(record.start_time),
    end_time:
      record.end_time === null ? null : toISOStringSafe(record.end_time),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
