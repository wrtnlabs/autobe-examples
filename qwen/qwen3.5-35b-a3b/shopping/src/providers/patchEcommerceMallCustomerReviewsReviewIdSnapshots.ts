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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceMallReviewSnapshot.ISummary> {
  // Verify customer ownership for customer actors
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      customer_id: props.customer.id,
    },
    select: { id: true },
  });
  if (review === null) {
    return {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Calculate pagination parameters
  const page = props.body.page ? parseInt(props.body.page, 10) : 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * safeLimit;
  // Build where clause with optional filters
  const whereInput: Prisma.ecommerce_mall_review_snapshotsWhereInput = {
    ecommerce_mall_review_id: props.reviewId,
  };
  if (props.body.snapshotType) {
    whereInput.snapshot_type = props.body.snapshotType;
  }
  if (props.body.createdAtGte) {
    whereInput.created_at = { gte: props.body.createdAtGte };
  }
  if (props.body.createdAtLte) {
    whereInput.created_at = { lte: props.body.createdAtLte };
  }
  // Build orderBy clause
  const orderByInput: Prisma.ecommerce_mall_review_snapshotsOrderByWithRelationInput[] =
    [{ created_at: props.body.ordering === "asc" ? "asc" : "desc" }];
  // Query snapshots
  const data = await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
    where:
      whereInput satisfies Prisma.ecommerce_mall_review_snapshotsWhereInput,
    skip,
    take: safeLimit,
    orderBy: orderByInput,
    ...EcommerceMallReviewSnapshotAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
    where:
      whereInput satisfies Prisma.ecommerce_mall_review_snapshotsWhereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallReviewSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
    data: transformed,
  };
}
