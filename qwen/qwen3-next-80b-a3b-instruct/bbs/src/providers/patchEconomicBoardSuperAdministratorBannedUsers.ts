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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EconomicBoardCitizenAtSummaryTransformer } from "../transformers/EconomicBoardCitizenAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardSuperAdministratorBannedUsers(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IPageIEconomicBoardCitizen.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_board_citizens.findMany({
    where: { is_banned: true },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EconomicBoardCitizenAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.economic_board_citizens.count({
    where: { is_banned: true },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EconomicBoardCitizenAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
