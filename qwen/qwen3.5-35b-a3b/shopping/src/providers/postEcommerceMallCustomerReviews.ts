import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
  const { customer, body } = props;
  // Verify product exists
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: body.product_id },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Verify customer has purchased the product with delivered status
  const purchasedOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
      where: {
        product: {
          id: body.product_id,
        },
        item_status: "delivered",
        order: {
          customer_id: customer.id,
        },
      },
    });
  if (purchasedOrderItems === null) {
    throw new HttpException(
      "You have not purchased this product or it has not been delivered",
      422,
    );
  }
  // Check for duplicate review
  const existingReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
      where: {
        customer_id_product_id: {
          customer_id: customer.id,
          product_id: body.product_id,
        },
      },
    });
  if (existingReview !== null) {
    throw new HttpException(
      "You have already written a review for this product",
      409,
    );
  }
  // Create the review
  const created = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: await EcommerceMallReviewCollector.collect({
      body,
      ecommerceMallCustomers: { id: customer.id },
    }),
    ...EcommerceMallReviewTransformer.select(),
  });
  // Transform and return
  return await EcommerceMallReviewTransformer.transform(created);
}
