import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerProductsProductIdReviewEligibility(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview.IEligibility> {
  // Verify product exists and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Find all delivered order items for this customer and product
  const deliveredOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        status: "delivered",
        order: {
          shopping_mall_customer_id: props.customer.id,
        },
      },
      select: {
        shopping_mall_order_id: true,
      },
    });
  // Total count of delivered order items
  const totalDeliveredItems: number & tags.Type<"int32"> =
    deliveredOrderItems.length;
  // Get unique order IDs from delivered items
  const deliveredOrderIds = [
    ...new Set(deliveredOrderItems.map((item) => item.shopping_mall_order_id)),
  ];
  // Find existing reviews for this customer and product
  const existingReviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: {
      customer_id: props.customer.id,
      product_id: props.productId,
      deleted_at: null,
    },
    select: {
      order_id: true,
    },
  });
  const reviewedCount: number & tags.Type<"int32"> = existingReviews.length;
  // Set of order IDs that already have reviews
  const reviewedOrderIds = new Set(
    existingReviews.map((review) => review.order_id),
  );
  // Compute eligible order IDs (delivered but not yet reviewed)
  const eligibleOrderIds = deliveredOrderIds.filter(
    (orderId) => !reviewedOrderIds.has(orderId),
  );
  // Determine eligibility and reason
  if (totalDeliveredItems === 0) {
    return {
      isEligible: false,
      reason: "NOT_PURCHASED",
      eligibleOrderIds: [],
      totalDeliveredItems,
      reviewedCount,
    } satisfies IShoppingMallReview.IEligibility;
  }
  if (eligibleOrderIds.length === 0) {
    return {
      isEligible: false,
      reason: "ALREADY_REVIEWED",
      eligibleOrderIds: [],
      totalDeliveredItems,
      reviewedCount,
    } satisfies IShoppingMallReview.IEligibility;
  }
  return {
    isEligible: true,
    reason: null,
    eligibleOrderIds: eligibleOrderIds satisfies (string &
      tags.Format<"uuid">)[],
    totalDeliveredItems,
    reviewedCount,
  } satisfies IShoppingMallReview.IEligibility;
}
