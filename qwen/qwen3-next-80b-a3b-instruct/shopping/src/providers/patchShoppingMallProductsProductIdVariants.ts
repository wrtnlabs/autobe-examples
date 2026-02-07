import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdVariants(props: {
  productId: string;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const productId = props.productId as string & tags.Format<"uuid">;
  // Use defaults since IRequest is empty (no page, limit, sort, etc. defined)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Main query - join with shopping_mall_products to calculate price
  const data = await MyGlobal.prisma.$queryRawUnsafe<
    {
      id: string;
      sku: string;
      option_values: string;
      price_override: number | null;
      base_price: number;
      stock: number;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    }[]
  >(
    `
    SELECT 
      pv.id,
      pv.sku,
      pv.option_values,
      pv.price_override,
      p.base_price,
      pv.stock,
      pv.created_at,
      pv.updated_at,
      pv.deleted_at
    FROM shopping_mall_product_variants pv
    JOIN shopping_mall_products p ON pv.product_id = p.id
    WHERE pv.product_id = $1 
      AND pv.deleted_at IS NULL
    ORDER BY pv.created_at DESC
    OFFSET $2
    LIMIT $3
  `,
    productId,
    skip,
    limit,
  );
  // Transform to summary
  const transformedData = data.map((item) => ({
    id: item.id,
    sku: item.sku,
    option_values: item.option_values,
    price: item.price_override !== null ? item.price_override : item.base_price,
    stock: item.stock,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(item.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: item.deleted_at
      ? (toISOStringSafe(item.deleted_at) as string & tags.Format<"date-time">)
      : null,
  }));
  // Get total count
  const totalResult = await MyGlobal.prisma.$queryRawUnsafe<
    {
      count: number;
    }[]
  >(
    `
    SELECT COUNT(*) as count
    FROM shopping_mall_product_variants pv
    JOIN shopping_mall_products p ON pv.product_id = p.id
    WHERE pv.product_id = $1 
      AND pv.deleted_at IS NULL
  `,
    productId,
  );
  const totalCount = totalResult[0]?.count ?? 0;
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
