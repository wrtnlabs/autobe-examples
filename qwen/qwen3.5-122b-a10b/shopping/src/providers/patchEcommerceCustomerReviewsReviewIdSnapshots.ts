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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceReviewSnapshotAtSummaryTransformer } from "../transformers/EcommerceReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceReviewSnapshot.ISummary> {
  // Verify review ownership - customer can only access their own reviews
  await MyGlobal.prisma.ecommerce_reviews.findFirstOrThrow({
    where: {
      id: props.reviewId,
      customer_id: props.customer.id,
    },
    select: { id: true },
  });
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for snapshots
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
  // Fetch paginated snapshots and total count
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_review_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceReviewSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_review_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceReviewSnapshotAtSummaryTransformer.transform,
    ),
  };
}
