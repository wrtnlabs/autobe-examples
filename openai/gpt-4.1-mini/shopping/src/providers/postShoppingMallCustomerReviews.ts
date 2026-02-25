import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.ICreate & {
    orderItemId: string & tags.Format<"uuid">;
  };
}): Promise<IShoppingMallReview> {
  if (props.body.rating < 1 || props.body.rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
      order_status: "delivered",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (order === null) {
    throw new HttpException("Delivered order not found", 403);
  }
  const deliveredOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        id: props.body.orderItemId,
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
      },
    });
  if (deliveredOrderItem === null) {
    throw new HttpException("Order item not found or not delivered", 403);
  }
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      customer_id: props.customer.id,
      order_item_id: deliveredOrderItem.id,
      deleted_at: null,
    },
  });
  if (existingReview !== null) {
    throw new HttpException("Review for this order item already exists", 409);
  }
  const createInput = await ShoppingMallReviewCollector.collect({
    body: props.body,
    customer: { id: props.customer.id },
    order: { id: deliveredOrderItem.shopping_mall_order_id },
    orderItem: { id: deliveredOrderItem.id },
  });
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: createInput,
    ...ShoppingMallReviewTransformer.select(),
  });
  await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data: {
      id: v4(),
      review: { connect: { id: created.id } },
      rating: created.rating,
      body: created.body ?? null,
      shopping_mall_order_item_id: deliveredOrderItem.id,
      created_at: created.created_at.toISOString(),
      updated_at: created.updated_at.toISOString(),
      deleted_at:
        created.deleted_at === null ? null : created.deleted_at.toISOString(),
    },
  });
  return await ShoppingMallReviewTransformer.transform(created);
}
