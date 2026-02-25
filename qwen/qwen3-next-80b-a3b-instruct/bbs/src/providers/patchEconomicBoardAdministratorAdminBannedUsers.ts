import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicBoardCitizenAtSummaryTransformer } from "../transformers/EconomicBoardCitizenAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardAdministratorAdminBannedUsers(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicBoardCitizen.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.economic_board_citizens.findMany({
      where: { is_banned: true },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...EconomicBoardCitizenAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.economic_board_citizens.count({
      where: { is_banned: true },
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicBoardCitizenAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
