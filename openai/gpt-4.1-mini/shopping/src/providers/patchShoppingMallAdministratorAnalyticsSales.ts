import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSalesAnalytic";
import { IShoppingMallSaleSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSalesAnalytic";
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

export async function patchShoppingMallAdministratorAnalyticsSales(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleSalesAnalytic.IRequest;
}): Promise<IPageIShoppingMallSaleSalesAnalytic.IResponse> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereFilters: Record<string, unknown> = { deleted_at: null };
  const groupedAggregates = await MyGlobal.prisma.shopping_mall_sales.groupBy({
    by: ["id", "created_at"],
    where: whereFilters,
    _sum: { base_price: true },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const totalRecords = await MyGlobal.prisma.shopping_mall_sales.count({
    where: whereFilters,
  });
  return {
    data: groupedAggregates.map(
      (item: {
        id: string;
        _sum?: {
          base_price: number | null;
        } | null;
      }) => ({
        sale_id: item.id,
        total_price: item._sum?.base_price ?? 0,
        quantity: 0,
        order_count: 0,
      }),
    ),
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  };
}
