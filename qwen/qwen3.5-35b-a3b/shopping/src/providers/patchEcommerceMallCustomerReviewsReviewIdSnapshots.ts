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
  const page = parseInt(props.body.page ?? "1", 10) || 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * validatedLimit;
  // Build where clause
  const whereClause: Prisma.ecommerce_mall_review_snapshotsWhereInput = {
    ecommerce_mall_review_id: props.reviewId,
    customer_id: props.customer.id,
    ...(props.body.snapshotType !== undefined && {
      snapshot_type: props.body.snapshotType,
    }),
    ...(props.body.createdAtGte !== undefined && {
      created_at: { gte: props.body.createdAtGte },
    }),
    ...(props.body.createdAtLte !== undefined && {
      created_at: { lte: props.body.createdAtLte },
    }),
  } satisfies Prisma.ecommerce_mall_review_snapshotsWhereInput;
  // Build order by
  const orderByInput: Prisma.ecommerce_mall_review_snapshotsOrderByWithRelationInput =
    props.body.ordering === "asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Query data
  const data = await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
    where: whereClause,
    orderBy: orderByInput,
    skip: skip,
    take: validatedLimit,
    ...EcommerceMallReviewSnapshotAtSummaryTransformer.select(),
  });
  // Query total count
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
    where: whereClause,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallReviewSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
  };
}
