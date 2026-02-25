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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallReviewSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallReviewSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminReviewsSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.shopping_mall_review_snapshotsWhereInput = {};
  if (props.body.review_id) {
    whereClause.review_id = props.body.review_id;
  }
  if (props.body.customer_id) {
    whereClause.review = { customer_id: props.body.customer_id };
  }
  if (props.body.product_id) {
    whereClause.review = { product_id: props.body.product_id };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { changed_at: "desc" },
      ...ShoppingMallReviewSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_review_snapshots.count({
      where: whereClause,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallReviewSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
