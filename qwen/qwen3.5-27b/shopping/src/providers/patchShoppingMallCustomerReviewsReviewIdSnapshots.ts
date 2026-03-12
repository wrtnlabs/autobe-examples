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
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  // Verify the review belongs to the customer
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: {
      id: props.reviewId,
    },
    select: {
      id: true,
      shopping_customer_id: true,
    },
  });
  if (review === null || review.shopping_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build orderBy based on sortBy and sortOrder
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy: Prisma.shopping_mall_review_snapshotsOrderByWithRelationInput =
    sortBy === "created_at"
      ? ({
          created_at: sortOrder,
        } satisfies Prisma.shopping_mall_review_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.shopping_mall_review_snapshotsOrderByWithRelationInput);
  // Fetch snapshots with pagination
  const data = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
  });
  // Count total snapshots
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
  });
  // Transform snapshots
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
