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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminReviewsReviewIdSnapshots(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  await MyGlobal.prisma.shopping_mall_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
    where: { shopping_mall_review_id: props.reviewId },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: { shopping_mall_review_id: props.reviewId },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallReviewSnapshot.ISummary;
}
