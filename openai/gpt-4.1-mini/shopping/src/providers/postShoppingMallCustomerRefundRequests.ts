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

export async function postShoppingMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  const { customer, body } = props;
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id:
        (body as any)["shopping_mall_order_item_id"] ??
        (body as any)["order_item_id"],
      status: "delivered",
      deleted_at: null,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or not refundable", 404);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.shopping_mall_order_id },
    select: {
      shopping_mall_customer_id: true,
    },
  });
  if (order === null || order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Order item not owned by customer", 404);
  }
  const productVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: orderItem.shopping_mall_product_variant_id },
    });
  if (productVariant === null) {
    throw new HttpException("Product variant not found", 404);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: (productVariant as any).shopping_mall_product_id },
    select: { seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.seller_id },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  const data = await ShoppingMallRefundRequestCollector.collect({
    body,
    shoppingMallOrderItem: orderItem,
    shoppingMallCustomer: customer,
    shoppingMallSeller: seller,
  });
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    return await prisma.shopping_mall_refund_requests.create({
      data,
    });
  });
  return {
    id: created.id,
    shopping_mall_order_item_id: created.shopping_mall_order_item_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    request_reason: created.request_reason,
    status: created.status,
    seller_response_reason: created.seller_response_reason ?? null,
    requested_at: toISOStringSafe(created.requested_at),
    responded_at:
      created.responded_at === null
        ? null
        : toISOStringSafe(created.responded_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
