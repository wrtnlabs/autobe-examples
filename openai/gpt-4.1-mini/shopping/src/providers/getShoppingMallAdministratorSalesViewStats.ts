import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleViewStat";
import { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
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

export async function getShoppingMallAdministratorSalesViewStats(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIShoppingMallSaleViewStat.ISummary> {
  const records = await MyGlobal.prisma.shopping_mall_sale_view_stats.findMany({
    where: { deleted_at: null },
  });
  const totalRecords =
    await MyGlobal.prisma.shopping_mall_sale_view_stats.count({
      where: { deleted_at: null },
    });
  return {
    data: records.map(() => ({})),
    pagination: {
      current: 1,
      limit: totalRecords === 0 ? 1 : totalRecords,
      records: totalRecords,
      pages: totalRecords > 0 ? 1 : 0,
    },
  };
}
