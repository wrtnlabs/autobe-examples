import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSalesSaleCode(props: {
  seller: SellerPayload;
  saleCode: string;
  body: IShoppingMallSale.IUpdate;
}): Promise<IShoppingMallSale> {
  const existing = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { code: props.saleCode },
  });

  if (!existing) {
    throw new HttpException("Product sale not found", 404);
  }

  if (existing.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (props.body.shopping_mall_category_id) {
    if (
      !(await MyGlobal.prisma.shopping_mall_categories.findUnique({
        where: { id: props.body.shopping_mall_category_id },
      }))
    ) {
      throw new HttpException("Category not found", 404);
    }
  }

  const updated = await MyGlobal.prisma.shopping_mall_sales.update({
    where: { code: props.saleCode },
    data: {
      ...props.body,
      updated_at: new Date(),
    },
  });

  const sellerData = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: updated.shopping_mall_seller_id },
  });

  const categoryData =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: updated.shopping_mall_category_id },
    });

  if (!sellerData || !categoryData) {
    throw new HttpException("Related data not found", 500);
  }

  return {
    id: updated.id,
    code: updated.code,
    title: updated.title,
    description: updated.description,
    brand: updated.brand === null ? undefined : updated.brand,
    condition: updated.condition,
    status: updated.status,
    short_description:
      updated.short_description === null
        ? undefined
        : updated.short_description,
    meta_keywords:
      updated.meta_keywords === null ? undefined : updated.meta_keywords,
    weight: updated.weight === null ? undefined : updated.weight,
    dimension_length:
      updated.dimension_length === null ? undefined : updated.dimension_length,
    dimension_width:
      updated.dimension_width === null ? undefined : updated.dimension_width,
    dimension_height:
      updated.dimension_height === null ? undefined : updated.dimension_height,
    manufacturer:
      updated.manufacturer === null ? undefined : updated.manufacturer,
    return_policy_days: updated.return_policy_days,
    warranty_info:
      updated.warranty_info === null ? undefined : updated.warranty_info,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    seller: {
      id: sellerData.id,
      store_name: sellerData.store_name,
      email: sellerData.email,
      status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
        sellerData.status,
      ),
      email_verified: sellerData.email_verified,
    },
    category: {
      id: categoryData.id,
      name: categoryData.name,
      slug: categoryData.slug,
      description:
        categoryData.description === null
          ? undefined
          : categoryData.description,
      image_url:
        categoryData.image_url === null ? undefined : categoryData.image_url,
      parent_id:
        categoryData.parent_id === null ? undefined : categoryData.parent_id,
      status: categoryData.status,
      display_order: categoryData.display_order,
      product_count: categoryData.product_count,
      created_at: toISOStringSafe(categoryData.created_at),
      updated_at: toISOStringSafe(categoryData.updated_at),
    },
  };
}
