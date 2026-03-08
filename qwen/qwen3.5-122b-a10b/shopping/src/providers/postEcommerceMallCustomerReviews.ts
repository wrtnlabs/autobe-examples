import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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
  // Verify order item exists, belongs to customer, and is delivered
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.body.order_item_id,
      order: {
        customer: {
          id: props.customer.id,
        },
      },
    },
    select: {
      id: true,
      status: true,
      ecommerce_mall_product_variant_id: true,
      productVariant: {
        select: {
          ecommerce_mall_product_id: true,
        },
      },
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "Order item not found or does not belong to you",
      403,
    );
  }
  // Verify order item status is "delivered"
  if (orderItem.status !== "delivered") {
    throw new HttpException("Can only review delivered orders", 400);
  }
  // Verify product_id matches order item's product
  if (
    orderItem.productVariant?.ecommerce_mall_product_id !==
    props.body.product_id
  ) {
    throw new HttpException("Product ID does not match order item", 400);
  }
  // Verify product exists and is not deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: {
      id: props.body.product_id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or has been deleted", 400);
  }
  // Check for duplicate review
  const existingReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
      where: {
        order_item_id: props.body.order_item_id,
      },
    });
  if (existingReview) {
    throw new HttpException("You have already reviewed this order item", 409);
  }
  // Validate rating (1-5)
  if (props.body.rating < 1 || props.body.rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  // Create review using collector
  const created = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: await EcommerceMallReviewCollector.collect({
      body: props.body,
      customer: props.customer,
    }),
    ...EcommerceMallReviewTransformer.select(),
  });
  // Transform and return
  return await EcommerceMallReviewTransformer.transform(created);
}
