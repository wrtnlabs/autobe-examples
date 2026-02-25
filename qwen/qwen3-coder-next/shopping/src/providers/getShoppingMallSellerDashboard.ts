import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerStatistic";
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

export async function getShoppingMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSellerStatistic.IDashboard> {
  const stats =
    await MyGlobal.prisma.shopping_mall_seller_statistics.findUniqueOrThrow({
      where: { shopping_mall_seller_id: props.seller.id },
    });
  return {
    total_products: stats.total_products,
    total_order_items: stats.total_order_items,
    pending_cancellation_requests: stats.pending_cancellation_requests,
    pending_refund_requests: stats.pending_refund_requests,
    average_rating: stats.average_rating ?? undefined,
    total_reviews: stats.total_reviews,
    total_sales_revenue: stats.total_sales_revenue,
    pending_seller_approvals: stats.pending_seller_approvals,
    pending_shipments: stats.pending_shipments,
    last_calculated_at: stats.last_calculated_at.toISOString(),
  };
}
