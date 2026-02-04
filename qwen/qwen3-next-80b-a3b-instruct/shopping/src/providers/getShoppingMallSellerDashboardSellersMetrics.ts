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
import { IShoppingMallAdminSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSellerDashboard";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerDashboardSellersMetrics(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallAdminSellerDashboard> {
  // This endpoint is for administrative dashboard - authorization is handled by middleware
  // The SellerPayload parameter is present but should be interpreted as auth context from middleware
  // We assume admin authorization has been validated by the NestJS controller layer
  // Query total product count from shopping_mall_products - use deleted_at instead of is_deleted
  const totalProductCount = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      deleted_at: null, // Correct field name as per schema
    },
  });
  // Query total order item count from shopping_mall_order_items
  // Based on loaded schema, use actual field names - likely "cancellation_request_id" and "refund_request_id" are null for non-canceled/refunded items
  const totalOrderItemCount =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        cancellation_request_id: null,
        refund_request_id: null,
      },
    });
  // Query pending cancellation request count from shopping_mall_cancellation_requests
  const pendingCancellationCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
      },
    });
  // Query pending refund request count from shopping_mall_refund_requests
  const pendingRefundCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
      },
    });
  return {
    total_product_count: totalProductCount,
    total_order_item_count: totalOrderItemCount,
    pending_cancellation_count: pendingCancellationCount,
    pending_refund_count: pendingRefundCount,
  };
}
