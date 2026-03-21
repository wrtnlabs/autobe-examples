import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallReviewCollector } from "../collectors/EcommerceMallReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersOrdersOrderIdItemsItemIdReview(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.ICreate;
}): Promise<IEcommerceMallReview> {
  // Verify order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
      deleted_at: true,
    },
  });
  // Check order belongs to customer
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify order item exists, belongs to this order, and get product info
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_product_id: true,
        status: true,
        ecommerce_mall_product_snapshot_id: true,
        ecommerce_mall_seller_profile_snapshot_id: true,
        quantity: true,
        unit_price: true,
        created_at: true,
      },
    });
  // Verify order item belongs to the order
  if (orderItem.ecommerce_mall_order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to this order", 400);
  }
  // Check order item status is delivered
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Review can only be submitted for delivered items",
      400,
    );
  }
  // Check for duplicate review (unique constraint: customer + product + order_item)
  const existingReview = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst(
    {
      where: {
        ecommerce_mall_customer_id: props.customer.id,
        ecommerce_mall_product_id: orderItem.ecommerce_mall_product_id,
        ecommerce_mall_order_item_id: props.itemId,
        deleted_at: null,
      },
    },
  );
  if (existingReview !== null) {
    throw new HttpException("Review already exists for this item", 409);
  }
  // Create the review using collector
  const created = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: await EcommerceMallReviewCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
      ecommerceMallOrderItems: { id: props.itemId },
    }),
    ...EcommerceMallReviewTransformer.select(),
  });
  // Return transformed review
  return await EcommerceMallReviewTransformer.transform(created);
}
