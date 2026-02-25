import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderRefundRequestTransformer } from "../transformers/ShoppingMallOrderRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerRefundRequestsRequestIdApproval(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderRefundRequest.IRequest;
}): Promise<IShoppingMallOrderRefundRequest> {
  // Step 1: Find the refund request with its relations
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findFirst({
      where: {
        id: props.requestId,
        status: "pending",
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_seller_id: true,
        seller: true,
      },
    });
  if (!refundRequest) {
    throw new HttpException(
      "Refund request not found or not in pending status",
      404,
    );
  }
  // Step 2: Verify seller ownership
  if (refundRequest.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: You are not authorized to approve this refund request",
      403,
    );
  }
  // Step 3: Update refund request status to approved
  const now = toISOStringSafe(new Date());
  const updatedRefundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        rejection_reason: null,
      },
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_seller_id: true,
      },
    });
  // Step 4: Update order item status to refunded
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: updatedRefundRequest.shopping_mall_order_item_id },
    data: {
      item_status: "refunded",
    },
  });
  // Step 5: Get order item details for variant ID
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: updatedRefundRequest.shopping_mall_order_item_id },
    select: {
      shopping_mall_order_variant_snapshot_id: true,
      quantity: true,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Step 6: Restore stock quantity
  const variantStock =
    await MyGlobal.prisma.shopping_mall_variant_stocks.findUnique({
      where: {
        id: orderItem.shopping_mall_order_variant_snapshot_id,
      },
    });
  if (variantStock) {
    await MyGlobal.prisma.shopping_mall_variant_stocks.update({
      where: {
        id: orderItem.shopping_mall_order_variant_snapshot_id,
      },
      data: {
        current_quantity: variantStock.current_quantity + orderItem.quantity,
      },
    });
  }
  // Step 7: Create inventory history record
  await MyGlobal.prisma.shopping_mall_inventory_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_variant_id:
        orderItem.shopping_mall_order_variant_snapshot_id,
      quantity_change: orderItem.quantity,
      reason: "refund",
      created_at: now,
    },
  });
  // Step 8: Create status log entry
  await MyGlobal.prisma.shopping_mall_order_refund_request_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_refund_request_id: props.requestId,
      old_status: "pending",
      new_status: "approved",
      reason: "Refund request approved by seller",
      changed_at: now,
    },
  });
  // Step 9: Query updated refund request with relations for response
  const finalRefundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findUnique({
      where: { id: props.requestId },
      ...ShoppingMallOrderRefundRequestTransformer.select(),
    });
  if (!finalRefundRequest) {
    throw new HttpException("Refund request not found after update", 404);
  }
  // Step 10: Transform to response DTO
  return await ShoppingMallOrderRefundRequestTransformer.transform(
    finalRefundRequest,
  );
}
