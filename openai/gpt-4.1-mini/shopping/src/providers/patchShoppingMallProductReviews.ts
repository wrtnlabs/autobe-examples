import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductReviews(props: {
  body: IShoppingMallProductReview.IRequest;
}): Promise<IPageIShoppingMallProductReview.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const where = {
    deleted_at: null as null,
  } as const;
  const orderBy = { created_at: "desc" as const };
  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_reviews.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_product_variant_id: true,
        rating: true,
        body: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_reviews.count({ where }),
  ]);
  const data = results.map((record) => ({
    id: record.id,
    customer_id: record.shopping_mall_customer_id,
    order_item_id: record.shopping_mall_order_item_id,
    product_variant_id: record.shopping_mall_product_variant_id,
    rating: record.rating,
    content: record.body === null ? undefined : record.body,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
