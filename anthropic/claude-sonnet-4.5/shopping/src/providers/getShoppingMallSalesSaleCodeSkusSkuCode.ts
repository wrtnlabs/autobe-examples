import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";

export async function getShoppingMallSalesSaleCodeSkusSkuCode(props: {
  saleCode: string;
  skuCode: string;
}): Promise<IShoppingMallSaleSku> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { code: props.saleCode },
    include: {
      seller: true,
      category: true,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findFirst({
    where: {
      shopping_mall_sale_id: sale.id,
      sku_code: props.skuCode,
    },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  const attributes =
    await MyGlobal.prisma.shopping_mall_sale_variant_attributes.findMany({
      where: {
        shopping_mall_sale_id: sale.id,
      },
    });

  const variantValues =
    await MyGlobal.prisma.shopping_mall_sale_variant_values.findMany({
      where: {
        shopping_mall_sale_variant_attribute_id: {
          in: attributes.map((attr) => attr.id),
        },
      },
      include: {
        attribute: true,
      },
    });

  return {
    id: sku.id,
    shopping_mall_sale_id: sku.shopping_mall_sale_id,
    sku_code: sku.sku_code,
    variant_combination: sku.variant_combination,
    base_price: sku.base_price,
    compare_at_price: sku.compare_at_price ?? undefined,
    sale_price: sku.sale_price ?? undefined,
    sale_start_at: sku.sale_start_at
      ? toISOStringSafe(sku.sale_start_at)
      : undefined,
    sale_end_at: sku.sale_end_at ? toISOStringSafe(sku.sale_end_at) : undefined,
    cost_price: sku.cost_price ?? undefined,
    barcode: sku.barcode ?? undefined,
    enabled: sku.enabled,
    created_at: toISOStringSafe(sku.created_at),
    updated_at: toISOStringSafe(sku.updated_at),
    sale: {
      id: sale.id,
      code: sale.code,
      title: sale.title,
      status: typia.assert<
        "draft" | "pending_approval" | "published" | "suspended" | "archived"
      >(sale.status),
      condition: typia.assert<"new" | "refurbished" | "used">(sale.condition),
      brand: sale.brand ?? undefined,
      short_description: sale.short_description ?? undefined,
      price: sku.base_price,
      thumbnail_url: undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info: sale.warranty_info ?? undefined,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at: sale.deleted_at
        ? toISOStringSafe(sale.deleted_at)
        : undefined,
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
        description: sale.category.description ?? undefined,
        image_url: sale.category.image_url ?? undefined,
        parent_id: sale.category.parent_id ?? undefined,
        status: sale.category.status,
        display_order: sale.category.display_order,
        product_count: sale.category.product_count,
        created_at: toISOStringSafe(sale.category.created_at),
        updated_at: toISOStringSafe(sale.category.updated_at),
      },
    },
    variant_values: variantValues.map((vv) => ({
      id: vv.id,
      shopping_mall_sale_variant_attribute_id:
        vv.shopping_mall_sale_variant_attribute_id,
      value: vv.value,
      color_code: vv.color_code ?? undefined,
      display_order: vv.display_order,
      created_at: toISOStringSafe(vv.created_at),
      attribute: {
        id: vv.attribute.id,
        sale_id: vv.attribute.shopping_mall_sale_id,
        name: vv.attribute.name,
        display_order: vv.attribute.display_order,
        created_at: toISOStringSafe(vv.attribute.created_at),
        values: [],
      },
    })),
  };
}
