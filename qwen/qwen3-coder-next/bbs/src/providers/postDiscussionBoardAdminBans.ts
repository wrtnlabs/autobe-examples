import { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBansBanRecordCollector } from "../collectors/DiscussionBoardBansBanRecordCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBansBanRecord.ICreate;
}): Promise<IDiscussionBoardBansBanRecord> {
  const created =
    await MyGlobal.prisma.discussion_board_bans_ban_records.create({
      data: await DiscussionBoardBansBanRecordCollector.collect({
        user: { id: "placeholder" },
        admin: { id: props.admin.id },
      }),
    });
  return {
    id: created.id,
    user_id: created.user_id,
    admin_id: created.admin_id,
    reason: created.reason,
    start_time: toISOStringSafe(created.start_time),
    end_time: created.end_time ? toISOStringSafe(created.end_time) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
