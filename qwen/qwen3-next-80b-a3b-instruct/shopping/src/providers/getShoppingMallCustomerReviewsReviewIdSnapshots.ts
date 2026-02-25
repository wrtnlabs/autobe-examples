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
import { ShoppingMallReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerReviewsReviewIdSnapshots(props: {
  customer: CustomerPayload;
  reviewId: string;
  page?: number;
  limit?: number;
}): Promise<IPageIShoppingMallReviewSnapshot> {
  const { customer, reviewId, page = 1, limit = 10 } = props;
  // Verify review exists (automatic 404 if not found)
  await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: reviewId },
  });
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: { review_id: reviewId },
      orderBy: { changed_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      ...ShoppingMallReviewSnapshotTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: { review_id: reviewId },
  });
  const data = await ArrayUtil.asyncMap(
    snapshots,
    ShoppingMallReviewSnapshotTransformer.transform,
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
