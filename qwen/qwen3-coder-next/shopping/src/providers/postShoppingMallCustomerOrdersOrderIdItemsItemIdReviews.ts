import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewCollector } from "../collectors/ShoppingMallReviewCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsItemIdReviews(props: {
  customer: CustomerPayload;
  orderId: string;
  itemId: string;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // Verify order item exists and belongs to customer
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
    },
    select: {
      id: true,
      status: true,
      customer_id: true,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify ownership
  if (orderItem.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check delivery status
  if (orderItem.status !== "delivered") {
    throw new HttpException("Order item not yet delivered", 400);
  }
  // Check if review already exists
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: {
        order_item_id: props.itemId,
      },
    },
  );
  if (existingReview) {
    throw new HttpException("Review already exists for this order item", 409);
  }
  // Create review using collector
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: await ShoppingMallReviewCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
      shoppingMallOrderItems: { id: props.itemId },
    }),
    select: {
      id: true,
      customer_id: true,
      order_item_id: true,
      rating: true,
      content: true,
    },
  });
  // Transform to response DTO
  const result: IShoppingMallReview = {
    id: created.id,
    customer_id: created.customer_id,
    order_item_id: created.order_item_id,
    rating: created.rating,
    content: created.content,
  };
  return result;
}
