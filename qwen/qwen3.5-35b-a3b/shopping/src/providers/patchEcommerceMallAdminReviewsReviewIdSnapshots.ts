import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallReviewSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceMallReviewSnapshot.ISummary> {
  // Parse pagination with defaults
  const page = props.body.page ? Math.max(1, parseInt(props.body.page, 10)) : 1;
  const limit = Math.min(
    100,
    Math.max(1, props.body.limit ?? props.body.pageSize ?? 20),
  );
  const skip = (page - 1) * limit;
  // Build where clause with reviewId filter
  const whereInput: Prisma.ecommerce_mall_review_snapshotsWhereInput = {
    ecommerce_mall_review_id: props.reviewId,
  };
  // Apply snapshot_type filter
  if (props.body.snapshotType) {
    whereInput.snapshot_type = props.body.snapshotType;
  }
  // Apply date range filters (AND logic)
  const created_at_filter: Prisma.ecommerce_mall_review_snapshotsWhereInput["created_at"] =
    {};
  if (props.body.createdAtGte) {
    created_at_filter.gte = props.body.createdAtGte;
  }
  if (props.body.createdAtLte) {
    created_at_filter.lte = props.body.createdAtLte;
  }
  if (Object.keys(created_at_filter).length > 0) {
    whereInput.created_at = created_at_filter;
  }
  // Determine ordering
  const ordering = props.body.ordering ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_review_snapshotsOrderByWithRelationInput =
    {
      created_at: ordering,
    };
  // Execute pagination with findMany and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallReviewSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallReviewSnapshotAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const totalPages = Math.max(0, Math.ceil(total / limit));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallReviewSnapshot.ISummary;
}
