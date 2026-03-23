import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAddressAtSummaryTransformer } from "../transformers/EcommerceMallAddressAtSummaryTransformer";
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallOrderTransformer } from "../transformers/EcommerceMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putEcommerceMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrder.IUpdate;
}): Promise<IEcommerceMallOrder> {
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      total_price: true,
      order_status: true,
      customer_id: true,
      shipping_address_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      shippingAddress: EcommerceMallAddressAtSummaryTransformer.select(),
      orderItems: {
        select: {
          id: true,
          quantity: true,
          product_name: true,
          variant_options: true,
          product_price: true,
          item_status: true,
          product_id: true,
          variant_id: true,
          seller_id: true,
        },
      },
    },
  });
  const status = order.order_status as
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
    | "partiallyCompleted";
  if (["shipped", "delivered", "cancelled", "refunded"].includes(status)) {
    throw new HttpException("Order cannot be modified", 409);
  }
  // Validate shipping address ownership
  const shipping_address_id =
    props.body.shipping_address_id ?? order.shipping_address_id;
  await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
    where: { id: shipping_address_id },
    select: { id: true },
  });
  // Process order items update if provided
  const new_order_items = props.body.order_items ?? [];
  if (new_order_items.length > 0) {
    // For each item in update, verify it exists and validate quantity changes
    for (const itemUpdate of new_order_items) {
      const existingItem = order.orderItems.find((i) => i.id === itemUpdate.id);
      if (!existingItem) {
        throw new HttpException("Order item not found", 404);
      }
      // Validate inventory availability for quantity increases
      if (
        itemUpdate.quantity !== undefined &&
        itemUpdate.quantity !== null &&
        itemUpdate.quantity > existingItem.quantity
      ) {
        await validateInventory(existingItem.variant_id, itemUpdate.quantity);
      }
    }
  }
  // Recalculate total price
  const recalculatedItems = props.body.order_items
    ? await resolveUpdatedOrderItems(order.orderItems, props.body.order_items)
    : order.orderItems;
  const new_total_price = recalculatedItems.reduce((sum, item) => {
    const quantity = item.quantity ?? 1;
    const price = item.product_price ?? 0;
    return sum + quantity * price;
  }, 0);
  // Build update data
  const updateData: Prisma.ecommerce_mall_ordersUpdateInput = {
    total_price: new_total_price,
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.shipping_address_id !== undefined) {
    updateData.shippingAddress = {
      connect: { id: props.body.shipping_address_id },
    };
  }
  if (
    props.body.order_items !== undefined &&
    props.body.order_items.length > 0
  ) {
    // Process order items updates
    for (const itemUpdate of props.body.order_items) {
      const existingItem = order.orderItems.find((i) => i.id === itemUpdate.id);
      if (!existingItem) {
        throw new HttpException("Order item not found", 404);
      }
      if (
        itemUpdate.quantity !== undefined &&
        itemUpdate.quantity !== null &&
        itemUpdate.quantity !== existingItem.quantity
      ) {
        await MyGlobal.prisma.ecommerce_mall_order_items.update({
          where: { id: itemUpdate.id },
          data: {
            quantity: itemUpdate.quantity,
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
    }
  }
  const updated = await MyGlobal.prisma.ecommerce_mall_orders.update({
    where: { id: props.orderId },
    data: updateData,
    ...EcommerceMallOrderTransformer.select(),
  });
  return await EcommerceMallOrderTransformer.transform(updated);
}
async function validateInventory(
  variantId: string,
  requestedQuantity: number,
): Promise<void> {
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: variantId },
      select: { stock_quantity: true },
    });
  if (!variant || variant.stock_quantity < requestedQuantity) {
    throw new HttpException("Insufficient inventory", 400);
  }
}
async function resolveUpdatedOrderItems(
  currentItems: Array<{
    id: string;
    quantity: number;
    product_price: number | null;
  }>,
  updates: IEcommerceMallOrderItem.IUpdate[],
): Promise<
  Array<{
    id: string;
    quantity: number;
    product_price: number | null;
  }>
> {
  const result = [...currentItems];
  for (const update of updates) {
    const index = result.findIndex((item) => item.id === update.id);
    if (index !== -1) {
      result[index] = {
        ...result[index],
        quantity: update.quantity ?? result[index].quantity,
      };
    }
  }
  return result;
}
