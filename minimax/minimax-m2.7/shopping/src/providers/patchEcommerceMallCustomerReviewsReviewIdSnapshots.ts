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
import { EcommerceMallReviewSnapshotTransformer } from "../transformers/EcommerceMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceMallReviewSnapshot> {
  // Verify the review exists and belongs to the customer
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUniqueOrThrow(
    {
      where: { id: props.reviewId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
      },
    },
  );
  // Authorization: customer can only view their own review snapshots
  if (review.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters with sensible defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query snapshots ordered chronologically (oldest to newest)
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: {
        ecommerce_mall_review_id: props.reviewId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "asc",
      },
      ...EcommerceMallReviewSnapshotTransformer.select(),
    });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
    where: {
      ecommerce_mall_review_id: props.reviewId,
    },
  });
  // Return paginated response with transformed data
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallReviewSnapshotTransformer.transform,
    ),
  };
}
