import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderOrderSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderOrderSummary";
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

export async function getShoppingMallSellerDashboardOrdersSummary(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallOrderOrderSummary> {
  try {
    const ordersSummary = await MyGlobal.prisma.shopping_mall_orders.aggregate({
      _count: {
        _all: true,
      },
      _sum: {
        total_price: true,
        total_quantity: true,
      },
      where: {
        deleted_at: null,
      },
    });
    return {};
  } catch (error) {
    throw new HttpException("Failed to fetch orders summary", 500);
  }
}
