import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewTransformer } from "../transformers/ShoppingMallReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerProductsProductIdReviewsReviewId(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IUpdate;
}): Promise<IShoppingMallReview> {
  // Step 1: Fetch the review — auto 404 if not found
  const existing =
    await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
      where: { id: props.reviewId },
      select: {
        id: true,
        product_id: true,
        customer_id: true,
        rating: true,
        body: true,
        deleted_at: true,
      },
    });
  // Step 2: Verify review belongs to the specified product
  if (existing.product_id !== props.productId) {
    throw new HttpException("Review does not belong to this product", 404);
  }
  // Step 3: Reject if review has been soft-deleted
  if (existing.deleted_at !== null) {
    throw new HttpException("Cannot update a deleted review", 422);
  }
  // Step 4: Reject if this customer is not the author
  if (existing.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Atomically insert snapshot (before edit) and apply update
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 5a: Capture immutable snapshot of the current state before the edit
    await tx.shopping_mall_review_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_review_id: props.reviewId,
        rating: existing.rating,
        body: existing.body,
        created_at: new Date(),
      },
    });
    // 5b: Apply requested changes — undefined fields are preserved, explicit null clears body
    await tx.shopping_mall_reviews.update({
      where: { id: props.reviewId },
      data: {
        ...(props.body.rating !== undefined && { rating: props.body.rating }),
        ...(props.body.body !== undefined && { body: props.body.body }),
        updated_at: new Date(),
      },
    });
  });
  // Step 6: Fetch and transform the updated review for the response
  const updated = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      ...ShoppingMallReviewTransformer.select(),
    },
  );
  return ShoppingMallReviewTransformer.transform(updated);
}
