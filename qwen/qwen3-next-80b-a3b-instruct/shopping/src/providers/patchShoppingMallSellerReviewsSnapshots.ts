import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerReviewsSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Initialize where with review as empty object to prevent possible undefined
  let where: Prisma.shopping_mall_review_snapshotsWhereInput = { review: {} };
  // Fetch all product IDs owned by this seller
  const productIds = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: { seller_id: props.seller.id },
    select: { id: true },
  });
  const productIdsSet = new Set(productIds.map((p) => p.id));
  // If review_id is provided, validate it belongs to seller's product
  if (props.body.review_id) {
    const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
      where: { id: props.body.review_id },
      select: { product_id: true },
    });
    if (!review || !productIdsSet.has(review.product_id)) {
      throw new HttpException("Forbidden", 403);
    }
    where.id = props.body.review_id;
  }
  // If customer_id is provided, filter by customer
  if (props.body.customer_id) {
    where.review = { customer: { id: props.body.customer_id } };
  }
  // If product_id is provided, filter by product (validated against seller ownership)
  if (props.body.product_id) {
    if (!productIdsSet.has(props.body.product_id)) {
      throw new HttpException("Forbidden", 403);
    }
    // Safety: ensure review exists before assigning nested properties
    if (where.review === undefined) {
      where.review = {};
    }
    const productId = props.body.product_id as string;
    where.review.product = { id: productId };
  }
  // Default scope: only reviews for seller's products
  if (
    !props.body.review_id &&
    !props.body.product_id &&
    !props.body.customer_id
  ) {
    if (where.review === undefined) {
      where.review = {};
    }
    where.review.product = { seller_id: props.seller.id };
  }
  // Fetch paginated review snapshots
  const data = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: { changed_at: "desc" },
    ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
