import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerRefundRequestsRefundRequestIdApprove(props: {
  seller: SellerPayload;
  refundRequestId: string;
}): Promise<IShoppingMallRefundRequest> {
  // Fetch refund request with order item to verify ownership
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        responded_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_seller_id: true,
            shopping_mall_product_variant_id: true,
            quantity: true,
          },
        },
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request already processed", 400);
  }
  // Verify seller ownership
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  // Execute transaction
  await MyGlobal.prisma.$transaction([
    // Update refund request
    MyGlobal.prisma.shopping_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: "approved",
        responded_at: now,
      },
    }),
    // Update order item status
    MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: refundRequest.orderItem.id },
      data: {
        status: "refunded",
        updated_at: now,
      },
    }),
    // Create inventory record for stock restoration
    MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant_id: refundRequest.orderItem.shopping_mall_product_variant_id,
        refund_request_id: props.refundRequestId,
        quantity_change: refundRequest.orderItem.quantity,
        reason: "Refund approved",
        created_at: now,
      },
    }),
    // Create snapshot
    MyGlobal.prisma.shopping_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_refund_request_id: props.refundRequestId,
        reason: refundRequest.reason,
        status: "approved",
        created_at: now,
      },
    }),
  ]);
  // Fetch updated refund request with transformer select
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...ShoppingMallRefundRequestTransformer.select(),
    });
  return await ShoppingMallRefundRequestTransformer.transform(updated);
}
