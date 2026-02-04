import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerSalesMetrics(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallSaleViewStat> {
  const result = await MyGlobal.prisma.shopping_mall_sales.aggregate({
    where: {
      created_at: {
        gt: new Date(0),
      },
    },
    _sum: {
      base_price: true,
    },
    _count: {
      id: true,
    },
    _avg: {
      base_price: true,
    },
  });
  return {
    totalRevenue: result._sum?.base_price || 0,
    transactionCount: result._count?.id || 0,
    averageTransactionValue: result._avg?.base_price || 0,
    totalUnitsSold: result._sum?.base_price || 0,
  };
}
