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

export async function getDiscussionBoardAdminAdminsBans(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardBansBanRecord.ISummary> {
  const bans = await MyGlobal.prisma.discussion_board_bans_ban_records.findMany(
    {
      where: { deleted_at: null },
      select: {
        id: true,
        user_id: true,
        admin_id: true,
        reason: true,
        start_time: true,
        end_time: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  return {
    bans: bans.map((ban) => ({
      id: ban.id,
      user_id: ban.user_id,
      admin_id: ban.admin_id,
      reason: ban.reason,
      start_time: toISOStringSafe(ban.start_time),
      end_time: ban.end_time ? toISOStringSafe(ban.end_time) : null,
      created_at: toISOStringSafe(ban.created_at),
      updated_at: toISOStringSafe(ban.updated_at),
      deleted_at: ban.deleted_at ? toISOStringSafe(ban.deleted_at) : null,
    })),
  };
}
