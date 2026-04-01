import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberProductsProductIdReviews(props: {
  member: MemberPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const [rows, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        OR: [{ is_public: true }, { deleted_at: { not: null } }],
      },
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
      ...ShoppingMallReviewAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_reviews.count({
      where: {
        shopping_mall_product_id: props.productId,
        OR: [{ is_public: true }, { deleted_at: { not: null } }],
      },
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
