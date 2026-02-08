import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleReviewCollector } from "../collectors/ShoppingMallSaleReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleReview.ICreate;
}): Promise<IShoppingMallSaleReview> {
  // Validate rating from body with type narrowing
  const rating = (
    props.body as {
      rating?: unknown;
    }
  ).rating;
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  // Fetch customer without 'session_id' field (not in schema)
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: { id: true },
  });
  if (!customer) throw new HttpException("Customer not found", 404);
  // Query order with correct nested where using 'customer' relation instead of 'customer_id'
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: (props.body as any).orderId,
      customer: { id: props.customer.id },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!order)
    throw new HttpException(
      "Order not found or does not belong to customer",
      404,
    );
  // Query order item with correct nested where using 'order' relation instead of 'order_id'
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: (props.body as any).orderItemId,
      order: { id: (props.body as any).orderId },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!orderItem)
    throw new HttpException(
      "Order item not found or does not belong to order",
      404,
    );
  // Collect data for creating review, pass body and customer id
  const createInput = await ShoppingMallSaleReviewCollector.collect({
    body: props.body,
    customer: { id: customer.id }, // removed session_id to avoid type error
  });
  // Create the review
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: createInput,
  });
  // Return IShoppingMallSaleReview, convert all Dates to string with toISOStringSafe
  return {
    id: created.id,
    customer_id: created.customer_id,
    order_id: created.order_id,
    order_item_id: created.order_item_id,
    rating: created.rating,
    body: created.body ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
