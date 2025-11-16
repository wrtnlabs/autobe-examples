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

export async function postShoppingMallSellerSalesSaleCodeSkus(props: {
  seller: SellerPayload;
  saleCode: string;
  body: IShoppingMallSaleSku.ICreate;
}): Promise<IShoppingMallSaleSku> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  if (sale.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const [seller, category] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    }),
  ]);

  if (!seller || !category) {
    throw new HttpException("Related data not found", 500);
  }

  const now = new Date().toISOString() as string & tags.Format<"date-time">;

  const createdSku = await MyGlobal.prisma.shopping_mall_sale_skus.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_sale_id: sale.id,
      sku_code: props.body.sku_code,
      variant_combination: props.body.variant_combination,
      base_price: props.body.base_price,
      compare_at_price: props.body.compare_at_price ?? null,
      sale_price: props.body.sale_price ?? null,
      sale_start_at: props.body.sale_start_at ?? null,
      sale_end_at: props.body.sale_end_at ?? null,
      cost_price: props.body.cost_price ?? null,
      barcode: props.body.barcode ?? null,
      enabled: props.body.enabled,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: createdSku.id,
    shopping_mall_sale_id: createdSku.shopping_mall_sale_id,
    sku_code: createdSku.sku_code,
    variant_combination: createdSku.variant_combination,
    base_price: createdSku.base_price,
    compare_at_price: createdSku.compare_at_price ?? undefined,
    sale_price: createdSku.sale_price ?? undefined,
    sale_start_at: createdSku.sale_start_at
      ? toISOStringSafe(createdSku.sale_start_at)
      : undefined,
    sale_end_at: createdSku.sale_end_at
      ? toISOStringSafe(createdSku.sale_end_at)
      : undefined,
    cost_price: createdSku.cost_price ?? undefined,
    barcode: createdSku.barcode ?? undefined,
    enabled: createdSku.enabled,
    created_at: toISOStringSafe(createdSku.created_at),
    updated_at: toISOStringSafe(createdSku.updated_at),
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
      price: createdSku.base_price,
      thumbnail_url: undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info: sale.warranty_info ?? undefined,
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
        description: category.description ?? undefined,
        image_url: category.image_url ?? undefined,
        parent_id: category.parent_id ?? undefined,
        status: category.status,
        display_order: category.display_order,
        product_count: category.product_count,
        created_at: toISOStringSafe(category.created_at),
        updated_at: toISOStringSafe(category.updated_at),
      },
    },
    variant_values: [],
  };
}
