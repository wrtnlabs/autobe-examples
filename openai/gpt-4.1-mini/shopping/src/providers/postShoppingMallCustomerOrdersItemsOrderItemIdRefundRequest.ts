import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallRefundRequestCollector } from "../collectors/ShoppingMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersItemsOrderItemIdRefundRequest(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
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
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (props.customer.id === undefined) {
    throw new HttpException("Forbidden: Invalid customer", 403);
  }
  // Removed runtime validation of refund reason.
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.shopping_mall_order_id },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      order_number: true,
      total_price: true,
      total_quantity: true,
      order_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden: Not your order", 403);
  }
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: orderItem.shopping_mall_product_variant_id },
      select: {
        shopping_mall_product_id: true,
      },
    });
  if (!productVariant) {
    throw new HttpException("Product variant not found", 404);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productVariant.shopping_mall_product_id },
    select: {
      seller_id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  const sellerId = product.seller_id;
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  const createInput = await ShoppingMallRefundRequestCollector.collect({
    body: props.body,
    shoppingMallOrderItem: orderItem,
    shoppingMallCustomer: { id: props.customer.id },
    shoppingMallSeller: { id: sellerId },
  });
  createInput.status = "pending";
  createInput.request_reason = (props.body as any).request_reason;
  const now = new Date();
  createInput.requested_at = now;
  createInput.created_at = now;
  createInput.updated_at = now;
  createInput.responded_at = null;
  createInput.seller_response_reason = null;
  createInput.deleted_at = null;
  const created = await MyGlobal.prisma.shopping_mall_refund_requests.create({
    data: createInput,
  });
  return created;
}
