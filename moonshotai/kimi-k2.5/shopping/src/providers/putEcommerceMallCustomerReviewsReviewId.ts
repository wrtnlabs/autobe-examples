import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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

export async function putEcommerceMallCustomerReviewsReviewId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IUpdate;
}): Promise<IEcommerceMallReview> {
  // Verify review exists, belongs to customer, and is not soft-deleted
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        customer_id: true,
        rating: true,
        content: true,
        product_id: true,
        order_id: true,
        order_item_id: true,
      },
    },
  );
  // Ownership check
  if (review.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden - Review does not belong to customer",
      403,
    );
  }
  // Create snapshot preserving current state
  await MyGlobal.prisma.ecommerce_mall_review_snapshots.create({
    data: {
      id: v4(),
      review: { connect: { id: review.id } },
      rating: review.rating,
      content: review.content,
      created_at: new Date(),
    },
  });
  // Build update data
  const updateData: Prisma.ecommerce_mall_reviewsUpdateInput = {
    ...(props.body.rating !== undefined && { rating: props.body.rating }),
    ...(props.body.content !== undefined && { content: props.body.content }),
    updated_at: new Date(),
  };
  // Execute update
  await MyGlobal.prisma.ecommerce_mall_reviews.update({
    where: { id: props.reviewId },
    data: updateData,
  });
  // Fetch updated record with full relations
  const updated =
    await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      ...EcommerceMallReviewTransformer.select(),
    });
  return await EcommerceMallReviewTransformer.transform(updated);
}
