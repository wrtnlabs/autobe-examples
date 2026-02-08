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

export async function patchDiscussionBoardAdministratorUserBans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardUserBan.IRequest;
}): Promise<IPageIDiscussionBoardUserBan.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_user_bansWhereInput = {
    deleted_at: null,
  };
  const records = await MyGlobal.prisma.discussion_board_user_bans.findMany({
    where,
    skip,
    take: limit,
    orderBy: { banned_at: "desc" },
  });
  const total = await MyGlobal.prisma.discussion_board_user_bans.count({
    where,
  });
  const data: IDiscussionBoardUserBan.ISummary[] = records.map((record) => ({
    id: record.id,
    registered_user_id: record.registered_user_id,
    administrator_id: record.administrator_id ?? undefined,
    reason: record.reason,
    banned_at: toISOStringSafe(record.banned_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
