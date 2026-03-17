import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { EcommerceMallReviewSnapshotTransformer } from "../transformers/EcommerceMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceMallReviewSnapshot.IRequest;
}): Promise<IPageIEcommerceMallReviewSnapshot.ISummary> {
  // Verify review exists and belongs to customer
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      customer_id: props.customer.id,
    },
  });
  if (review === null) {
    throw new HttpException("Review not found or access denied", 404);
  }
  // Build where clause with optional filters
  const whereInput = {
    ecommerce_mall_review_id: props.reviewId,
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
  } satisfies Prisma.ecommerce_mall_review_snapshotsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallReviewSnapshotTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_review_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallReviewSnapshotTransformer.transform,
  );
  // Cast data to correct type for response
  const summaryData =
    typia.assert<IPageIEcommerceMallReviewSnapshot.ISummary["data"]>(data);
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryData,
  };
}
