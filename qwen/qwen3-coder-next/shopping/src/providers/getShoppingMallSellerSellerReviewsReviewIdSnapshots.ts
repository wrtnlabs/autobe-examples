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

export async function getShoppingMallSellerSellerReviewsReviewIdSnapshots(props: {
  seller: SellerPayload;
  reviewId: string;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const limit = 10;
  const page = 1;
  const snapshots =
    await MyGlobal.prisma.shopping_mall_review_snapshots.findMany({
      where: {
        shopping_mall_review_id: props.reviewId,
      },
      orderBy: {
        created_at: "desc" as const,
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        shopping_mall_review_id: true,
        customer_id: true,
        product_id: true,
        rating: true,
        text: true,
        edited_at: true,
        created_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count({
    where: {
      shopping_mall_review_id: props.reviewId,
    },
  });
  return {
    data: snapshots.map((record) => ({
      id: record.id,
      shopping_mall_review_id: record.shopping_mall_review_id,
      customer_id: record.customer_id,
      product_id: record.product_id,
      rating: record.rating,
      text: record.text,
      edited_at: record.edited_at ? toISOStringSafe(record.edited_at) : null,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
