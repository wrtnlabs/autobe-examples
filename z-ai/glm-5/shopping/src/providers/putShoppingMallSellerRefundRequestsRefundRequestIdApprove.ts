import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

export async function putShoppingMallSellerRefundRequestsRefundRequestIdApprove(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  // Find the cancellation request (used as refund request for delivered items)
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        reason: true,
        status: true,
        seller_response: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: {
            id: true,
            status: true,
            quantity: true,
            unit_price: true,
            shopping_mall_seller_id: true,
            shopping_mall_product_variant_id: true,
            product_name: true,
            product_thumbnail_url: true,
            product_category_name: true,
            variant_sku_code: true,
            variant_price: true,
            seller_shop_name: true,
            created_at: true,
            order: {
              select: {
                id: true,
                order_number: true,
                total_price: true,
                status: true,
                created_at: true,
                customer: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    phone_number: true,
                    deleted_at: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            deleted_at: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  // Verify seller owns the product
  if (refundRequest.orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify pending status
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not in pending status", 400);
  }
  // Verify delivered status (refund requirement)
  if (refundRequest.orderItem.status !== "delivered") {
    throw new HttpException("Order item is not delivered", 400);
  }
  // Find shipment for this order item to check delivery date
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
      where: {
        items: {
          some: {
            orderItem: {
              id: refundRequest.orderItem.id,
            },
          },
        },
      },
      select: {
        delivered_at: true,
      },
    });
  // Verify 7-day refund window
  if (shipment?.delivered_at) {
    const deliveryDate = shipment.delivered_at;
    const now = new Date();
    const daysSinceDelivery =
      (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > 7) {
      throw new HttpException("Refund window has expired (7 days)", 400);
    }
  }
  // Get variant options for the order item
  const variantOptions =
    await MyGlobal.prisma.shopping_mall_order_item_variant_options.findMany({
      where: {
        shopping_mall_order_item_id: refundRequest.orderItem.id,
      },
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
      },
    });
  // Execute all updates in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create snapshot
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: refundRequest.id,
        previous_status: refundRequest.status,
        new_status: "approved",
        reason: refundRequest.reason,
        seller_response: "Refund approved",
        rejection_reason: null,
        created_at: new Date(),
      },
    });
    // Update refund request status
    const updated = await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: "approved",
        seller_response: "Refund approved",
        updated_at: new Date(),
      },
    });
    // Update order item status to refunded
    await tx.shopping_mall_order_items.update({
      where: { id: refundRequest.orderItem.id },
      data: {
        status: "refunded",
      },
    });
    // Create positive inventory record for stock restoration
    if (refundRequest.orderItem.shopping_mall_product_variant_id) {
      await tx.shopping_mall_product_inventory_histories.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            refundRequest.orderItem.shopping_mall_product_variant_id,
          quantity_change: refundRequest.orderItem.quantity,
          reason: "Refund approved",
          created_at: new Date(),
        },
      });
    }
    return updated;
  });
  const order = refundRequest.orderItem.order;
  // Return the refund request response
  return {
    id: result.id,
    orderItem: {
      id: refundRequest.orderItem.id,
      status: "refunded",
      quantity: refundRequest.orderItem.quantity,
      unit_price: refundRequest.orderItem.unit_price,
      subtotal:
        refundRequest.orderItem.quantity * refundRequest.orderItem.unit_price,
      product_name: refundRequest.orderItem.product_name,
      product_thumbnail_url: refundRequest.orderItem.product_thumbnail_url,
      product_category_name: refundRequest.orderItem.product_category_name,
      variant_sku_code: refundRequest.orderItem.variant_sku_code,
      variant_price: refundRequest.orderItem.variant_price,
      seller_shop_name: refundRequest.orderItem.seller_shop_name,
      created_at: toISOStringSafe(refundRequest.orderItem.created_at),
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalPrice: order.total_price,
        status: order.status,
        customer: {
          id: order.customer.id,
          email: order.customer.email,
          displayName: order.customer.display_name,
          phoneNumber: order.customer.phone_number,
          isDeleted: order.customer.deleted_at !== null,
          createdAt: toISOStringSafe(order.customer.created_at),
          updatedAt: toISOStringSafe(order.customer.updated_at),
        },
        createdAt: toISOStringSafe(order.created_at),
      },
      variant_options: variantOptions.map((opt) => ({
        id: opt.id,
        key: opt.key,
        value: opt.value,
        created_at: toISOStringSafe(opt.created_at),
      })),
    },
    reason: result.reason,
    status: "approved",
    sellerResponse: result.seller_response,
    rejectionReason: result.rejection_reason,
    createdAt: toISOStringSafe(result.created_at),
    updatedAt: toISOStringSafe(result.updated_at),
  };
}
