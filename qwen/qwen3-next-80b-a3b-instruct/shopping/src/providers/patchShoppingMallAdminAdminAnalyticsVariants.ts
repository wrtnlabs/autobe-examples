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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminAnalyticsVariants(props: {
  admin: AdminPayload;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 50;
  const skip = (page - 1) * limit;
  const data: any[] = await MyGlobal.prisma.$queryRaw`
    SELECT
      ov.variant_id,
      p.name AS product_name,
      ov.sku,
      SUM(oi.quantity) AS total_units_sold,
      SUM(ih.quantity_change) AS total_stock_on_hand,
      AVG(oi.unit_price) AS average_unit_price,
      COUNT(DISTINCT ov.seller_id) AS unique_sellers
    FROM shopping_mall_order_items oi
    JOIN shopping_mall_product_variants ov ON oi.variant_id = ov.id
    JOIN shopping_mall_products p ON ov.product_id = p.id
    LEFT JOIN shopping_mall_inventory_histories ih ON ov.id = ih.shopping_mall_product_variant_id
    WHERE ov.deleted_at IS NULL
    GROUP BY ov.variant_id, p.name, ov.sku
    ORDER BY ov.sku
    LIMIT ${limit} OFFSET ${skip}
  `;
  const total: any[] = await MyGlobal.prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM shopping_mall_order_items oi
    JOIN shopping_mall_product_variants ov ON oi.variant_id = ov.id
    WHERE ov.deleted_at IS NULL
  `;
  return {
    data: data.map((item: any) => ({
      variant_id: item.variant_id as string satisfies string &
        tags.Format<"uuid">,
      product_name: item.product_name,
      sku: item.sku,
      total_units_sold: Number(item.total_units_sold),
      total_stock_on_hand: Number(item.total_stock_on_hand),
      average_unit_price: Number(item.average_unit_price),
      unique_sellers: Number(item.unique_sellers),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: Number(total[0]?.count ?? 0),
      pages: Math.ceil(Number(total[0]?.count ?? 0) / limit),
    } satisfies IPage.IPagination,
  };
}
