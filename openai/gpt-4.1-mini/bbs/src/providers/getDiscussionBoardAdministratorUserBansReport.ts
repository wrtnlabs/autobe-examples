import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorUserBansReport(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = { deleted_at: null };
  const [bans, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" },
      select: {
        id: true,
        registered_user_id: true,
        administrator_id: true,
        reason: true,
        banned_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_user_bans.count({ where: whereInput }),
  ]);
  return {
    data: bans.map((ban) => ({
      id: ban.id,
      user_id: ban.registered_user_id,
      user_email: null,
      user_name: null,
      user_created_at: null,
      administrator_id: ban.administrator_id,
      administrator_username: null,
      reason: ban.reason,
      banned_at: toISOStringSafe(ban.banned_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
