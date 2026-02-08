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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerAnalyticsSales(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleSalesAnalytic.IRequest;
}): Promise<IPageIShoppingMallSaleSalesAnalytic.ISummary> {
  const { seller } = props;
  const page = 1;
  const limit = 100;
  const skip = 0;
  const whereSale: {
    deleted_at: null;
    seller_id: string & import("typia").tags.Format<"uuid">;
  } = {
    deleted_at: null,
    seller_id: seller.id,
  };
  const totalRecords = await MyGlobal.prisma.shopping_mall_sales.count({
    where: whereSale,
  });
  const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where: whereSale,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      seller_id: true,
      name: true,
      created_at: true,
    },
  });
  const data = sales.map((sale) => ({
    saleId: sale.id,
    saleName: sale.name ?? "",
    totalAmount: 0,
    totalQuantity: 0,
    orderCount: 0,
    createdAt: toISOStringSafe(sale.created_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  };
}
