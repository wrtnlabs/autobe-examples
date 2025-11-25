import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function getShoppingMallSalesSaleCode(props: {
  saleCode: string;
}): Promise<IShoppingMallSale> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { code: props.saleCode },
    include: {
      seller: true,
      category: true,
    },
  });

  if (!sale) {
    throw new HttpException("Product sale not found", 404);
  }

  return {
    id: sale.id,
    code: sale.code,
    title: sale.title,
    description: sale.description,
    brand: sale.brand === null ? undefined : sale.brand,
    condition: sale.condition,
    status: sale.status,
    short_description:
      sale.short_description === null ? undefined : sale.short_description,
    meta_keywords: sale.meta_keywords === null ? undefined : sale.meta_keywords,
    weight: sale.weight === null ? undefined : sale.weight,
    dimension_length:
      sale.dimension_length === null ? undefined : sale.dimension_length,
    dimension_width:
      sale.dimension_width === null ? undefined : sale.dimension_width,
    dimension_height:
      sale.dimension_height === null ? undefined : sale.dimension_height,
    manufacturer: sale.manufacturer === null ? undefined : sale.manufacturer,
    return_policy_days: sale.return_policy_days,
    warranty_info: sale.warranty_info === null ? undefined : sale.warranty_info,
    created_at: toISOStringSafe(sale.created_at),
    updated_at: toISOStringSafe(sale.updated_at),
    seller: {
      id: sale.seller.id,
      store_name: sale.seller.store_name,
      email: sale.seller.email,
      status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
        sale.seller.status,
      ),
      email_verified: sale.seller.email_verified,
    },
    category: {
      id: sale.category.id,
      name: sale.category.name,
      slug: sale.category.slug,
      description:
        sale.category.description === null
          ? undefined
          : sale.category.description,
      image_url:
        sale.category.image_url === null ? undefined : sale.category.image_url,
      parent_id:
        sale.category.parent_id === null ? undefined : sale.category.parent_id,
      status: sale.category.status,
      display_order: sale.category.display_order,
      product_count: sale.category.product_count,
      created_at: toISOStringSafe(sale.category.created_at),
      updated_at: toISOStringSafe(sale.category.updated_at),
    },
  };
}
