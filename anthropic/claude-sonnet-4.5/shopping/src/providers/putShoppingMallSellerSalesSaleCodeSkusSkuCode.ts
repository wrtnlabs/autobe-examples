import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSalesSaleCodeSkusSkuCode(props: {
  seller: SellerPayload;
  saleCode: string;
  skuCode: string;
  body: IShoppingMallSaleSku.IUpdate;
}): Promise<IShoppingMallSaleSku> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale listing not found", 404);
  }

  if (sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const existingSku = await MyGlobal.prisma.shopping_mall_sale_skus.findFirst({
    where: {
      shopping_mall_sale_id: sale.id,
      sku_code: props.skuCode,
    },
  });

  if (!existingSku) {
    throw new HttpException("SKU not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_sale_skus.update({
    where: {
      id: existingSku.id,
    },
    data: {
      ...(props.body.sku_code !== undefined && {
        sku_code: props.body.sku_code,
      }),
      ...(props.body.variant_combination !== undefined && {
        variant_combination: props.body.variant_combination,
      }),
      ...(props.body.base_price !== undefined && {
        base_price: props.body.base_price,
      }),
      ...(props.body.compare_at_price !== undefined && {
        compare_at_price: props.body.compare_at_price,
      }),
      ...(props.body.sale_price !== undefined && {
        sale_price: props.body.sale_price,
      }),
      ...(props.body.sale_start_at !== undefined && {
        sale_start_at: props.body.sale_start_at
          ? new Date(props.body.sale_start_at)
          : null,
      }),
      ...(props.body.sale_end_at !== undefined && {
        sale_end_at: props.body.sale_end_at
          ? new Date(props.body.sale_end_at)
          : null,
      }),
      ...(props.body.cost_price !== undefined && {
        cost_price: props.body.cost_price,
      }),
      ...(props.body.barcode !== undefined && { barcode: props.body.barcode }),
      ...(props.body.enabled !== undefined && { enabled: props.body.enabled }),
      updated_at: new Date(),
    },
  });

  const [seller, category, firstImage, variantAttributes] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    }),
    MyGlobal.prisma.shopping_mall_sale_images.findFirst({
      where: {
        shopping_mall_sale_id: sale.id,
        shopping_mall_sale_sku_id: null,
      },
      orderBy: {
        display_order: "asc",
      },
    }),
    MyGlobal.prisma.shopping_mall_sale_variant_attributes.findMany({
      where: {
        shopping_mall_sale_id: sale.id,
      },
      include: {
        shopping_mall_sale_variant_values: {
          orderBy: {
            display_order: "asc",
          },
        },
      },
      orderBy: {
        display_order: "asc",
      },
    }),
  ]);

  if (!seller || !category) {
    throw new HttpException("Sale data incomplete", 500);
  }

  return {
    id: updated.id,
    shopping_mall_sale_id: updated.shopping_mall_sale_id,
    sku_code: updated.sku_code,
    variant_combination: updated.variant_combination,
    base_price: updated.base_price,
    compare_at_price:
      updated.compare_at_price === null ? undefined : updated.compare_at_price,
    sale_price: updated.sale_price === null ? undefined : updated.sale_price,
    sale_start_at: updated.sale_start_at
      ? toISOStringSafe(updated.sale_start_at)
      : undefined,
    sale_end_at: updated.sale_end_at
      ? toISOStringSafe(updated.sale_end_at)
      : undefined,
    cost_price: updated.cost_price === null ? undefined : updated.cost_price,
    barcode: updated.barcode === null ? undefined : updated.barcode,
    enabled: updated.enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    sale: {
      id: sale.id,
      code: sale.code,
      title: sale.title,
      status: typia.assert<
        "draft" | "pending_approval" | "published" | "suspended" | "archived"
      >(sale.status),
      condition: typia.assert<"new" | "refurbished" | "used">(sale.condition),
      brand: sale.brand === null ? undefined : sale.brand,
      short_description:
        sale.short_description === null ? undefined : sale.short_description,
      price: updated.base_price,
      thumbnail_url: firstImage ? firstImage.url_small : undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info:
        sale.warranty_info === null ? undefined : sale.warranty_info,
      created_at: toISOStringSafe(sale.created_at),
      updated_at: toISOStringSafe(sale.updated_at),
      deleted_at: sale.deleted_at
        ? toISOStringSafe(sale.deleted_at)
        : undefined,
      seller: {
        id: seller.id,
        store_name: seller.store_name,
        email: seller.email,
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          seller.status,
        ),
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
    variant_values: variantAttributes.flatMap((attr) =>
      attr.shopping_mall_sale_variant_values.map((vv) => ({
        id: vv.id,
        shopping_mall_sale_variant_attribute_id:
          vv.shopping_mall_sale_variant_attribute_id,
        value: vv.value,
        color_code: vv.color_code === null ? undefined : vv.color_code,
        display_order: vv.display_order,
        attribute: {
          id: attr.id,
          sale_id: attr.shopping_mall_sale_id,
          name: attr.name,
          display_order: attr.display_order,
          created_at: toISOStringSafe(attr.created_at),
          values: attr.shopping_mall_sale_variant_values.map((v) => ({
            id: v.id,
            shopping_mall_sale_variant_attribute_id:
              v.shopping_mall_sale_variant_attribute_id,
            value: v.value,
            color_code: v.color_code === null ? undefined : v.color_code,
            display_order: v.display_order,
            created_at: toISOStringSafe(v.created_at),
          })),
        },
        created_at: toISOStringSafe(vv.created_at),
      })),
    ),
  };
}
