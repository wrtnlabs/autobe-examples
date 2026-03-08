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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  // Verify customer owns the review (including soft-deleted reviews)
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      id: props.reviewId,
      shopping_mall_customer_id: props.customer.id,
    },
    select: { id: true },
  });
  if (review === null) {
    throw new HttpException("Review not found or access denied", 404);
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Query snapshots ordered chronologically (oldest first)
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: {
        shopping_mall_review_id: props.reviewId,
      },
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
    });
  // Count total records for pagination
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
  });
  // Transform results to ISummary format
  const data: IShoppingMallReviewSnapshot.ISummary[] = snapshots.map(
    (snapshot) => ({
      id: snapshot.id,
      rating: snapshot.rating,
      content: snapshot.content,
      created_at: snapshot.created_at.toISOString(),
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallReviewSnapshot.ISummary;
}
