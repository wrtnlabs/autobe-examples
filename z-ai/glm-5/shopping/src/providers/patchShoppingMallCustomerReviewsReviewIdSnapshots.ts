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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  // 1. Verify review exists and belongs to customer
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (review.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 3. Parse sorting - default created_at ASC (oldest first, chronological)
  // Only 'created_at' or '-created_at' are valid per specification
  const sortValue = props.body.sort ?? "created_at";
  const orderBy: Prisma.shopping_mall_review_snapshotsOrderByWithRelationInput =
    sortValue === "-created_at"
      ? { created_at: "desc" }
      : { created_at: "asc" };
  // 4. Query snapshots with transformer select
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: { shopping_mall_review_id: props.reviewId },
      skip,
      take: limit,
      orderBy,
      ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
    });
  // 5. Count total for pagination
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: { shopping_mall_review_id: props.reviewId },
  });
  // 6. Transform results using transformer
  const data = await ArrayUtil.asyncMap(
    snapshots,
    ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
  );
  // 7. Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
