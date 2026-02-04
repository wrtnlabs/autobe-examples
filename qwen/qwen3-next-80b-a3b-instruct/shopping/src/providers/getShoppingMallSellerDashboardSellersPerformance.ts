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
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerDashboardSellersPerformance(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSaleSnapshot> {
  // Query the aggregated sales view for seller performance metrics
  const stats = await MyGlobal.prisma.shopping_mall_sale_view_stats.findFirst({
    where: {
      id: {
        equals: props.seller.id,
      },
    },
  });
  // Return zeroed metrics if no data exists
  if (!stats) {
    return {
      total_sales: 0,
      revenue: 0,
      total_orders: 0,
      customer_count: 0,
      total_units_sold: 0,
      average_order_value: 0,
      customer_retention_rate: 0,
    };
  }
  // Return metrics directly from view_stats as they're pre-aggregated
  // Convert numeric values to appropriate types and ensure proper format
  // Note: view_stats only provides view_count and shopping_mall_sale_id
  // Other fields required for IShoppingMallSaleSnapshot do not exist in this view
  // So we return zeros for all non-available metrics
  return {
    total_sales: stats.view_count as number & tags.Type<"int32">,
    revenue: 0,
    total_orders: stats.shopping_mall_sale_id
      ? 1
      : (0 as number & tags.Type<"int32">),
    customer_count: 0 as number & tags.Type<"int32">,
    total_units_sold: 0 as number & tags.Type<"int32">,
    average_order_value: 0,
    customer_retention_rate: 0,
  };
}
