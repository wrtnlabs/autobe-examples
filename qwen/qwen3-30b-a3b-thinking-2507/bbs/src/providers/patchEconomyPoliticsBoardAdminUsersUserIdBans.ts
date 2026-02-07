import { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardUserBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomyPoliticsBoardUserBanAtSummaryTransformer } from "../transformers/EconomyPoliticsBoardUserBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomyPoliticsBoardAdminUsersUserIdBans(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardUserBan.IRequest;
}): Promise<IPageIEconomyPoliticsBoardUserBan.ISummary> {
  const user = await MyGlobal.prisma.economy_politics_board_users.findUnique({
    where: { id: props.userId, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economy_politics_board_user_bans.findMany({
    where: {
      user_id: props.userId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { start_at: "desc" },
    ...EconomyPoliticsBoardUserBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.economy_politics_board_user_bans.count({
    where: {
      user_id: props.userId,
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomyPoliticsBoardUserBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
