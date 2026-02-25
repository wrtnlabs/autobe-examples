import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewResponse";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceReviewResponseCollector } from "../collectors/EcommerceReviewResponseCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceReviewResponseTransformer } from "../transformers/EcommerceReviewResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerProductsProductIdReviewsReviewIdSellerResponse(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReviewResponse.ICreate;
}): Promise<IEcommerceReviewResponse> {
  // First, verify the product belongs to the seller
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
    select: { id: true },
  });
  // Validate that the review exists and belongs to the specified product
  const review = await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
      orderItem: {
        productVariant: {
          product: { id: product.id },
        },
      },
    },
    select: { id: true },
  });
  // Check if a response already exists for this review
  const existingResponse =
    await MyGlobal.prisma.ecommerce_review_responses.findUnique({
      where: { ecommerce_review_id: props.reviewId },
    });
  if (existingResponse) {
    throw new HttpException(
      "A seller response already exists for this review",
      409,
    );
  }
  // Create the response using the collector
  const responseData = await EcommerceReviewResponseCollector.collect({
    body: props.body,
    seller: { id: props.seller.id },
    review: { id: props.reviewId },
  });
  // Create the response record with proper type safety
  const createdResponse =
    await MyGlobal.prisma.ecommerce_review_responses.create({
      data: responseData,
      ...EcommerceReviewResponseTransformer.select(),
    });
  // Transform and return the response
  return await EcommerceReviewResponseTransformer.transform(createdResponse);
}
