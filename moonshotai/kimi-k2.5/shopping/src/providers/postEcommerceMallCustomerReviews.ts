import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.ICreate;
}): Promise<IEcommerceMallReview> {
  // Verify order item exists and check ownership via order relationship
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.body.orderItemId,
    },
    include: {
      order: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order belongs to current customer
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden - Order item does not belong to current customer",
      403,
    );
  }
  // Verify order item status is delivered
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered before reviewing",
      422,
    );
  }
  // Check if review already exists for this order item
  const existingReview = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst(
    {
      where: {
        order_item_id: props.body.orderItemId,
      },
    },
  );
  if (existingReview !== null) {
    throw new HttpException("Review already exists for this order item", 409);
  }
  // Create review using collector
  const reviewInput = await EcommerceMallReviewCollector.collect({
    body: props.body,
    ecommerceMallCustomers: { id: props.customer.id },
  });
  const created = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: reviewInput,
  });
  // Fetch complete review with relations for transformation
  const reviewWithRelations =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: created.id },
      ...EcommerceMallReviewTransformer.select(),
    });
  return await EcommerceMallReviewTransformer.transform(reviewWithRelations);
}
