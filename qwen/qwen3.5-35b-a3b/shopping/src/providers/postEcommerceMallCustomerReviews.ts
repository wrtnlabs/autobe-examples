import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
  // Validate order exists for purchase verification
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      ecommerce_mall_order_id: props.body.order_id,
    },
    select: { id: true },
  });
  if (orderItem === null) {
    throw new HttpException("Order does not exist for this review", 400);
  }
  // Validate uniqueness - one review per product per order
  const existingReview = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst(
    {
      where: {
        customer_id: props.customer.id,
        product_id: props.body.product_id,
        order_id: props.body.order_id,
        deleted_at: null,
      },
    },
  );
  if (existingReview !== null) {
    throw new HttpException(
      "Customer has already written a review for this product in this order",
      409,
    );
  }
  // Create review in transaction
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.ecommerce_mall_reviews.create({
      data: await EcommerceMallReviewCollector.collect({
        body: props.body,
        ecommerceMallCustomers: {
          id: props.customer.id,
        },
      }),
      ...EcommerceMallReviewTransformer.select(),
    });
  });
  // Transform to response DTO
  return await EcommerceMallReviewTransformer.transform(created);
}
