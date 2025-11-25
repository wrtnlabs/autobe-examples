import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";

export async function getShoppingMallSalesSaleCodeVariantAttributesVariantAttributeId(props: {
  saleCode: string;
  variantAttributeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleVariantAttribute> {
  const variantAttribute =
    await MyGlobal.prisma.shopping_mall_sale_variant_attributes.findUnique({
      where: { id: props.variantAttributeId },
    });

  if (!variantAttribute) {
    throw new HttpException("Variant attribute not found", 404);
  }

  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: variantAttribute.shopping_mall_sale_id },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  if (sale.code !== props.saleCode) {
    throw new HttpException("Variant attribute not found", 404);
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: sale.shopping_mall_seller_id },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: sale.shopping_mall_category_id },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  const skus = await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
    where: {
      shopping_mall_sale_id: sale.id,
    },
    select: { base_price: true },
  });

  const minPrice =
    skus.length > 0
      ? Math.min(...skus.map((sku) => Number(sku.base_price)))
      : 0;

  const images = await MyGlobal.prisma.shopping_mall_sale_images.findMany({
    where: {
      shopping_mall_sale_id: sale.id,
    },
    orderBy: { display_order: "asc" },
    take: 1,
    select: { url_small: true },
  });

  const thumbnailUrl = images.length > 0 ? images[0].url_small : null;

  const values =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: { shopping_mall_sale_variant_attribute_id: variantAttribute.id },
      orderBy: { display_order: "asc" },
    });

  return {
    id: variantAttribute.id,
    shopping_mall_sale_id: variantAttribute.shopping_mall_sale_id,
    name: variantAttribute.name,
    display_order: variantAttribute.display_order,
    created_at: toISOStringSafe(variantAttribute.created_at),
    sale: {
      id: sale.id,
      code: sale.code,
      title: sale.title,
      status: sale.status as
        | "draft"
        | "pending_approval"
        | "published"
        | "suspended"
        | "archived",
      condition: sale.condition as "new" | "refurbished" | "used",
      brand: sale.brand === null ? undefined : sale.brand,
      short_description:
        sale.short_description === null ? undefined : sale.short_description,
      price: minPrice,
      thumbnail_url: thumbnailUrl === null ? undefined : thumbnailUrl,
      return_policy_days: sale.return_policy_days,
      warranty_info:
        sale.warranty_info === null ? undefined : sale.warranty_info,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at:
        sale.deleted_at === null ? undefined : toISOStringSafe(sale.deleted_at),
      seller: {
        id: seller.id,
        store_name: seller.store_name,
        email: seller.email,
        status: seller.status as
          | "pending"
          | "approved"
          | "rejected"
          | "suspended",
        email_verified: seller.email_verified,
      },
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description:
          category.description === null ? undefined : category.description,
        image_url: category.image_url === null ? undefined : category.image_url,
        parent_id: category.parent_id === null ? undefined : category.parent_id,
        status: category.status,
        display_order: category.display_order,
        product_count: category.product_count,
        created_at: toISOStringSafe(category.created_at),
        updated_at: toISOStringSafe(category.updated_at),
      },
    },
    values: values.map((value) => ({
      id: value.id,
      shopping_mall_sale_variant_attribute_id:
        value.shopping_mall_sale_variant_attribute_id,
      value: value.value,
      color_code: value.color_code === null ? undefined : value.color_code,
      display_order: value.display_order,
      created_at: toISOStringSafe(value.created_at),
    })),
  };
}
