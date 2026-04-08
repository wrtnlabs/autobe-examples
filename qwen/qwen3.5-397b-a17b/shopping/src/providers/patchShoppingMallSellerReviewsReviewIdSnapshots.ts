import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerReviewsReviewIdSnapshots(props: {
  seller: SellerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
    select: {
      shopping_mall_product_id: true,
    },
  });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: review.shopping_mall_product_id },
      select: {
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort?.replace(/^-/, "") ?? "created_at";
  const sortDir = props.body.sort?.startsWith("-") ? "desc" : "asc";
  const records = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany(
    {
      where: {
        shopping_mall_review_id: props.reviewId,
      },
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortDir,
      },
      ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
    ),
  };
}
