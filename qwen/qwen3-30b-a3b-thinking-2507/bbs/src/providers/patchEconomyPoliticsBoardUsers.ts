import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomyPoliticsBoardUserAtSummaryTransformer } from "../transformers/EconomyPoliticsBoardUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomyPoliticsBoardUsers(props: {
  body: IEconomyPoliticsBoardUser.IRequest;
}): Promise<IPageIEconomyPoliticsBoardUser.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.economy_politics_board_usersWhereInput = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.economy_politics_board_users.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...EconomyPoliticsBoardUserAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.economy_politics_board_users.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomyPoliticsBoardUserAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
