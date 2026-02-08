import { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserUnban";
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

export async function patchDiscussionBoardAdministratorUserUnbans(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardUserUnban.IRequest;
}): Promise<IPageIDiscussionBoardUserUnban.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.discussion_board_user_unbansWhereInput = {
    deleted_at: null,
  };
  const dataRaw = await MyGlobal.prisma.discussion_board_user_unbans.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reason: true,
      administrator_id: true,
      user_ban_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_user_unbans.count({
    where: whereConditions,
  });
  const data = dataRaw.map((item) => ({
    id: item.id,
    reason: item.reason,
    administrator_id: item.administrator_id,
    user_ban_id: item.user_ban_id,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at:
      item.deleted_at === null ? undefined : toISOStringSafe(item.deleted_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
