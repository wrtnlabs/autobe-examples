import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewAtSnapshotTransformer } from "../transformers/EcommerceMallReviewAtSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.ISnapshotRequest;
}): Promise<IPageIEcommerceMallReview.ISnapshot> {
  // Verify review exists and customer is the author
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      customer_id: props.customer.id,
    },
    select: {
      id: true,
    },
  });
  if (review === null) {
    throw new HttpException("Review not found or access denied", 404);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.ecommerce_mall_review_snapshotsWhereInput = {
    ecommerce_mall_review_id: props.reviewId,
    ...(props.body.search && {
      content: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  };
  // Sort configuration
  const orderBy: Prisma.ecommerce_mall_review_snapshotsOrderByWithRelationInput =
    props.body.sort?.field === "created_at"
      ? { created_at: props.body.sort.direction }
      : { created_at: "desc" };
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
    where,
  });
  // Fetch snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallReviewAtSnapshotTransformer.select(),
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallReviewAtSnapshotTransformer.transform,
  );
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
