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

export async function patchShoppingMallReviewSnapshots(props: {
  body: IShoppingMallReviewSnapshot.IRequest;
}): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.shopping_mall_review_snapshots.findMany(
    {
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        shopping_mall_product_review_id: true,
        rating: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_review_snapshots.count();
  const data = records.map((record) => ({
    id: record.id,
    shopping_mall_product_review_id: record.shopping_mall_product_review_id,
    rating: record.rating,
    body: record.body,
    created_at: record.created_at ? toISOStringSafe(record.created_at) : null,
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
