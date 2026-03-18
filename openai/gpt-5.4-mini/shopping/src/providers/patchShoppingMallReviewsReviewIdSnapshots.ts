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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallReviewsReviewIdSnapshots(props: {
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: {
        review_id: review.id,
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        review_id: true,
        rating: true,
        content: true,
        is_deleted: true,
        created_at: true,
        deleted_at: true,
      },
    });
  const records: number =
    await MyGlobal.prisma.shopping_mall_review_snapshots.count({
      where: {
        review_id: review.id,
      },
    });
  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      reviewId: snapshot.review_id,
      rating: snapshot.rating,
      content: snapshot.content,
      isDeleted: snapshot.is_deleted,
      createdAt: toISOStringSafe(snapshot.created_at),
      deletedAt:
        snapshot.deleted_at === null
          ? null
          : toISOStringSafe(snapshot.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: limit === 0 ? 0 : Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallReviewSnapshot.ISummary;
}
