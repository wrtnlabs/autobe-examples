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

export async function postShoppingMallCustomerProductsProductIdReviews(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // Step 1: Verify product exists and is not deleted
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Step 2: Validate the order item — fetch with order ownership and product variant info
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.order_item_id },
      select: {
        id: true,
        status: true,
        shopping_mall_product_variant_id: true,
        order: {
          select: { shopping_mall_customer_id: true },
        },
      },
    });
  // Step 3: Authorization check — ensure the order belongs to the authenticated customer
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Status check — order item must be 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be in delivered status to write a review",
      422,
    );
  }
  // Step 5: Product match check — variant must belong to this product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: orderItem.shopping_mall_product_variant_id },
      select: { shopping_mall_product_id: true },
    });
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Order item does not belong to the specified product",
      422,
    );
  }
  // Step 6: Duplicate review check — proactively check before unique constraint fires
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findUnique(
    {
      where: { order_item_id: orderItem.id },
      select: { id: true },
    },
  );
  if (existingReview !== null) {
    throw new HttpException("A review already exists for this order item", 409);
  }
  // Step 7: Atomically create review + first snapshot
  const reviewId = v4();
  const snapshotId = v4();
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_reviews.create({
      data: {
        id: reviewId,
        rating: props.body.rating,
        body: props.body.body ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        customer: { connect: { id: props.customer.id } },
        product: { connect: { id: props.productId } },
        orderItem: { connect: { id: props.body.order_item_id } },
      },
    });
    await tx.shopping_mall_review_snapshots.create({
      data: {
        id: snapshotId,
        rating: props.body.rating,
        body: props.body.body ?? null,
        created_at: now,
        review: { connect: { id: reviewId } },
      },
    });
  });
  // Step 8: Fetch and return full review DTO
  const created = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow(
    {
      where: { id: reviewId },
      ...ShoppingMallReviewTransformer.select(),
    },
  );
  return await ShoppingMallReviewTransformer.transform(created);
}
