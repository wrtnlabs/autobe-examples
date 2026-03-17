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

export async function getEcommerceMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string;
}): Promise<IPageIEcommerceMallReviewSnapshot> {
  // Verify review exists and check ownership
  const review = await MyGlobal.prisma.ecommerce_mall_reviews.findUnique({
    where: { id: props.reviewId },
    select: { id: true, customer_id: true, deleted_at: true },
  });
  if (review === null || review.deleted_at !== null) {
    throw new HttpException("Review not found", 404);
  }
  // Authorization: must be review owner or admin
  // Note: CustomerPayload doesn't have role info, so we check if customer_id matches
  // For admin access, the system would need additional role checking which isn't in payload
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query all snapshots for this review, ordered by created_at DESC
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_review_snapshots.findMany({
      where: { ecommerce_mall_review_id: props.reviewId },
      orderBy: { created_at: "desc" },
      ...EcommerceMallReviewSnapshotTransformer.select(),
    });
  // Transform to DTO format
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallReviewSnapshotTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
