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

export async function patchShoppingMallCustomerProductsProductIdReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  // 1. Validate product exists and is not deleted
  await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Validate review exists and belongs to the product
  const review = await MyGlobal.prisma.shopping_mall_reviews.findFirstOrThrow({
    where: {
      id: props.reviewId,
      product_id: props.productId,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  // 3. Authorization: verify the customer owns this review
  if (review.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Build where clause with proper merging of date and rating range filters
  const createdAtFilter =
    props.body.from != null || props.body.to != null
      ? {
          created_at: {
            ...(props.body.from != null && { gte: new Date(props.body.from) }),
            ...(props.body.to != null && { lte: new Date(props.body.to) }),
          },
        }
      : {};
  const ratingFilter =
    props.body.ratingMin != null || props.body.ratingMax != null
      ? {
          rating: {
            ...(props.body.ratingMin != null && { gte: props.body.ratingMin }),
            ...(props.body.ratingMax != null && { lte: props.body.ratingMax }),
          },
        }
      : {};
  const whereInput = {
    shopping_mall_review_id: props.reviewId,
    ...createdAtFilter,
    ...ratingFilter,
  } satisfies Prisma.shopping_mall_review_snapshotsWhereInput;
  // 5. Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 6. Query snapshots and count (sequential, not parallel)
  const data = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
    where: whereInput,
    orderBy: { created_at: "asc" },
    skip,
    take: limit,
    select: {
      id: true,
      shopping_mall_review_id: true,
      rating: true,
      body: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: whereInput,
  });
  // 7. Map to ISummary DTO and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          reviewId: snapshot.shopping_mall_review_id,
          rating: snapshot.rating,
          body: snapshot.body,
          created_at: snapshot.created_at.toISOString(),
        }) satisfies IShoppingMallReviewSnapshot.ISummary,
    ),
  };
}
