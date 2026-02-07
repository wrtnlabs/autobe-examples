import { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansBanRecord";
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

export async function getDiscussionBoardAdminUsersUserIdBans(props: {
  admin: AdminPayload;
  userId: string;
}): Promise<IPageIDiscussionBoardBansBanRecord.ISummary> {
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_bans_ban_records.findMany(
    {
      where: {
        user_id: props.userId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    },
  );
  const total = await MyGlobal.prisma.discussion_board_bans_ban_records.count({
    where: {
      user_id: props.userId,
      deleted_at: null,
    },
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      user_id: record.user_id as string & tags.Format<"uuid">,
      admin_id: record.admin_id as string & tags.Format<"uuid">,
      reason: record.reason,
      start_time: toISOStringSafe(record.start_time),
      end_time: record.end_time ? toISOStringSafe(record.end_time) : null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
