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
  // Verify review exists and belongs to customer
  await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
      shopping_customer_id: props.customer.id,
    },
    select: { id: true },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting parameters
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Build orderBy with type assertion
  const orderByInput = (
    sortBy === "created_at"
      ? { created_at: sortOrder === "asc" ? "asc" : "desc" }
      : { created_at: sortOrder === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.shopping_mall_review_snapshotsOrderByWithRelationInput;
  // Query snapshots with pagination and sorting
  const data = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
  });
  // Transform snapshots to DTO format
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
