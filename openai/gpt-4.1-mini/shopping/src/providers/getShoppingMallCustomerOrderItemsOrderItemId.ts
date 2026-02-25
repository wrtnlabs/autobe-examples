import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrderItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_product_variant_id: true,
      quantity: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      refundRequests: {
        select: {
          id: true,
          shopping_mall_order_item_id: true,
          shopping_mall_customer_id: true,
          shopping_mall_seller_id: true,
          status: true,
          request_reason: true,
          seller_response_reason: true,
          requested_at: true,
          responded_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      cancellationRequests: {
        select: {
          id: true,
          shopping_mall_customer_id: true,
          shopping_mall_order_item_id: true,
          reason: true,
          seller_approval_status: true,
          seller_approval_reason: true,
          requested_at: true,
          processed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      order: {
        select: {
          id: true,
          shopping_mall_customer_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          reviews: true,
          order_number: true,
          total_price: true,
          total_quantity: true,
          order_status: true,
          orderItemSnapshots: true,
          orderItems: true,
          orderSnapshots: true,
          customer: {
            select: {
              id: true,
              email: true,
              password_hash: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              display_name: true,
              phone_number: true,
            },
          },
        },
      },
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          stock_quantity: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          snapshots: true,
          productReviews: true,
          productReviewSnapshots: true,
          orderItems: true,
          product: {
            select: {
              id: true,
            },
          },
          inventoryHistories: true,
        },
      },
      snapshots: true,
      shipmentItems: true,
      reviews: true,
      shipmentOrderItems: true,
      productReviews: true,
      productReviewSnapshots: true,
    },
  });
  if (!orderItem || orderItem.deleted_at !== null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  function convDate(
    date: Date | null | undefined,
  ): (string & tags.Format<"date-time">) | null {
    return date
      ? (toISOStringSafe(date) as string & tags.Format<"date-time">)
      : null;
  }
  function mapDateArray<
    T extends {
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null | undefined;
    },
  >(array: T[] | null | undefined) {
    return (array ?? []).map((item) => ({
      ...item,
      created_at: convDate(item.created_at),
      updated_at: convDate(item.updated_at),
      deleted_at: convDate(item.deleted_at),
    }));
  }
  const converted = {
    ...orderItem,
    created_at: convDate(orderItem.created_at),
    updated_at: convDate(orderItem.updated_at),
    deleted_at: convDate(orderItem.deleted_at),
    refundRequests: mapDateArray(orderItem.refundRequests),
    cancellationRequests: mapDateArray(orderItem.cancellationRequests),
    order: {
      ...orderItem.order,
      created_at: convDate(orderItem.order.created_at),
      updated_at: convDate(orderItem.order.updated_at),
      deleted_at: convDate(orderItem.order.deleted_at),
      customer: {
        ...orderItem.order.customer,
        created_at: convDate(orderItem.order.customer.created_at),
        updated_at: convDate(orderItem.order.customer.updated_at),
        deleted_at: convDate(orderItem.order.customer.deleted_at),
      },
      reviews: mapDateArray(orderItem.order.reviews),
      orderItemSnapshots: mapDateArray(orderItem.order.orderItemSnapshots),
      orderItems: mapDateArray(orderItem.order.orderItems),
      orderSnapshots: mapDateArray(orderItem.order.orderSnapshots),
    },
    productVariant: {
      ...orderItem.productVariant,
      created_at: convDate(orderItem.productVariant.created_at),
      updated_at: convDate(orderItem.productVariant.updated_at),
      deleted_at: convDate(orderItem.productVariant.deleted_at),
      snapshots: mapDateArray(orderItem.productVariant.snapshots),
      productReviews: mapDateArray(orderItem.productVariant.productReviews),
      productReviewSnapshots: mapDateArray(
        orderItem.productVariant.productReviewSnapshots,
      ),
      orderItems: mapDateArray(orderItem.productVariant.orderItems),
      product: { ...orderItem.productVariant.product },
      inventoryHistories: mapDateArray(
        orderItem.productVariant.inventoryHistories,
      ),
    },
    snapshots: mapDateArray(orderItem.snapshots),
    shipmentItems: mapDateArray(orderItem.shipmentItems),
    reviews: mapDateArray(orderItem.reviews),
    shipmentOrderItems: mapDateArray(orderItem.shipmentOrderItems),
    productReviews: mapDateArray(orderItem.productReviews),
    productReviewSnapshots: mapDateArray(orderItem.productReviewSnapshots),
  };
  return await ShoppingMallOrderItemTransformer.transform(converted);
}
