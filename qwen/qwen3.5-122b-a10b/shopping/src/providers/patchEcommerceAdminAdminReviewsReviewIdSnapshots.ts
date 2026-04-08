import { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceReviewSnapshotAtSummaryTransformer } from "../transformers/EcommerceReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminAdminReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceReviewSnapshot.ISummary> {
  // Verify review exists (404 if not found)
  await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
  });
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const offset = props.body.offset ?? (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.ecommerce_review_snapshotsWhereInput = {
    ecommerce_review_id: props.reviewId,
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.rating !== undefined && {
      rating: props.body.rating,
    }),
    ...(props.body.rating_from !== undefined && {
      rating: {
        gte: props.body.rating_from,
      },
    }),
    ...(props.body.rating_to !== undefined && {
      rating: {
        lte: props.body.rating_to,
      },
    }),
  };
  // Query snapshots with pagination
  const records = await MyGlobal.prisma.ecommerce_review_snapshots.findMany({
    where: whereInput,
    skip: offset,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceReviewSnapshotAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_review_snapshots.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceReviewSnapshotAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceReviewSnapshot.ISummary;
}
