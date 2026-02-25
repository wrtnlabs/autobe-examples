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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerReviewsReviewIdSnapshots(props: {
  seller: SellerPayload;
  reviewId: string;
  page?: number;
  limit?: number;
}): Promise<IPageIShoppingMallReviewSnapshot> {
  const page = props.page ?? 1;
  const limit = props.limit ?? 100;
  const skip = (page - 1) * limit;
  // Ensure review exists and belongs to seller
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: {
      id: props.reviewId,
      product: {
        seller_id: props.seller.id,
      },
    },
  });
  // Query snapshots
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: {
        review_id: props.reviewId,
      },
      skip,
      take: limit,
      orderBy: {
        changed_at: "desc",
      },
    });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      review_id: props.reviewId,
    },
  });
  // Transform each snapshot using asyncMap with correct async return
  const data = await ArrayUtil.asyncMap(snapshots, async (snapshot) => {
    return {
      id: snapshot.id,
      rating: snapshot.rating,
      content: snapshot.content === null ? undefined : snapshot.content,
      is_deleted: snapshot.is_deleted,
      changed_at: toISOStringSafe(snapshot.changed_at),
      changed_by: snapshot.changed_by,
      previous_rating:
        snapshot.previous_rating === null
          ? undefined
          : snapshot.previous_rating,
      previous_content:
        snapshot.previous_content === null
          ? undefined
          : snapshot.previous_content,
      previous_is_deleted:
        snapshot.previous_is_deleted === null
          ? undefined
          : snapshot.previous_is_deleted,
      review_id: snapshot.review_id,
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIShoppingMallReviewSnapshot;
}
