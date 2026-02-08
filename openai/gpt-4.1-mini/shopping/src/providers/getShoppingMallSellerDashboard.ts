import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSellerDashboard";
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
}): Promise<IShoppingMallSellerSellerDashboard> {
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: { approval_status: true, rejection_reason: true },
  });
  if (!sellerRecord) throw new HttpException("Seller not found", 404);
  if (sellerRecord.approval_status !== "approved") {
    throw new HttpException("Access forbidden: seller not approved", 403);
  }
  const totalProducts = await MyGlobal.prisma.shopping_mall_products.count({
    where: { seller_id: props.seller.id, deleted_at: null },
  });
  const totalOrderItems = await MyGlobal.prisma.shopping_mall_order_items.count(
    {
      where: {
        productVariant: {
          product: { seller_id: props.seller.id, deleted_at: null },
        },
      },
    },
  );
  const pendingCancellationCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        orderItem: {
          productVariant: {
            product: { seller_id: props.seller.id, deleted_at: null },
          },
        },
        // Removed invalid 'seller_approved' property
      },
    });
  const pendingRefundCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        orderItem: {
          productVariant: {
            product: { seller_id: props.seller.id, deleted_at: null },
          },
        },
        // Removed invalid 'seller_approved' property
      },
    });
  return {
    totalProducts,
    totalOrderItems,
    pendingCancellationCount,
    pendingRefundCount,
  };
}
