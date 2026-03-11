import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewTransformer } from "../transformers/EcommerceMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.ICreate;
}): Promise<IEcommerceMallReview> {
  const { customer, body } = props;
  const customer_id: string & tags.Format<"uuid"> = customer.id;
  const product_id: string & tags.Format<"uuid"> = body.product_id;
  const rating: number & tags.Type<"int32"> = body.rating;
  const text_content: string | null | undefined = body.text_content;
  // Validate rating range (business logic validation)
  if (rating < 1 || rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  // Verify customer has purchased the product with delivered status
  const purchasedOrderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
      where: {
        product: { id: product_id },
        item_status: "delivered",
        order: {
          customer_id: customer_id,
        },
      },
      select: { id: true },
    });
  if (!purchasedOrderItem) {
    throw new HttpException(
      "Customer has not purchased this product or it has not been delivered",
      403,
    );
  }
  // Verify no existing review exists for this customer-product combination
  const existingReview =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
      where: {
        customer_id_product_id: {
          customer_id,
          product_id,
        },
      },
      select: { id: true },
    });
  if (existingReview) {
    throw new HttpException("Review already exists for this product", 409);
  }
  // Create the review
  const createdReview = await MyGlobal.prisma.ecommerce_mall_reviews.create({
    data: {
      id: v4(),
      rating,
      text_content: text_content ?? null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: customer_id } },
      product: { connect: { id: product_id } },
    },
    ...EcommerceMallReviewTransformer.select(),
  });
  return await EcommerceMallReviewTransformer.transform(createdReview);
}
