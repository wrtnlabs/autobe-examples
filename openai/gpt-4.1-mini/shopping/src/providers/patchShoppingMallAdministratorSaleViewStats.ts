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

export async function patchShoppingMallAdministratorSaleViewStats(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleViewStat.IRequest;
}): Promise<IPageIShoppingMallSaleViewStat.ISummary> {
  // No pagination or filtering properties exist on IRequest, so omit those.
  // Simple query without filters
  const dataRaw = await MyGlobal.prisma.shopping_mall_sale_view_stats.findMany({
    orderBy: { last_viewed_at: "desc" },
  });
  // Map Prisma data to API DTO summary
  const data = dataRaw.map((record) => {
    return {
      sale_id: record.shopping_mall_sale_id,
      view_count: record.view_count,
      unique_view_count: record.unique_view_count,
      first_viewed_at: toISOStringSafe(record.first_viewed_at),
      last_viewed_at: toISOStringSafe(record.last_viewed_at),
    };
  });
  // Return default pagination with no paging
  const pagination = {
    current: 1,
    limit: 0,
    records: data.length,
    pages: 1,
  };
  return { data, pagination };
}
