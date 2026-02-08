import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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

export async function patchShoppingMallAdministratorSales(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSale.IRequest;
}): Promise<IPageIShoppingMallSale.ISummary> {
  // Use default values for pagination as the input type does not have page or limit
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Simple filter with deleted_at only
  const where: Prisma.shopping_mall_salesWhereInput = {
    deleted_at: null,
  };
  const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      base_price: true,
      category_id: true,
      seller_id: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sales.count({ where });
  return {
    data: sales.map((sale) => ({
      id: sale.id,
      name: sale.name,
      base_price: sale.base_price,
      category: null,
      seller_id: sale.seller_id,
      thumbnail: null,
    })) as IShoppingMallSale.ISummary[],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
