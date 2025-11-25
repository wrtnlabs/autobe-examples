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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSalesSaleCodeSkusSkuCode(props: {
  seller: SellerPayload;
  saleCode: string;
  skuCode: string;
}): Promise<IShoppingMallSaleSku> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException(
      "Sale not found or you do not have permission to access it",
      404,
    );
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

  const [inventoryStocks, cartItems, orderItems, inventoryReservations] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_inventory_stocks.findFirst({
        where: { shopping_mall_sale_sku_id: sku.id },
      }),
      MyGlobal.prisma.shopping_mall_cart_items.findFirst({
        where: { shopping_mall_sale_sku_id: sku.id },
      }),
      MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: { shopping_mall_sale_sku_id: sku.id },
      }),
      MyGlobal.prisma.shopping_mall_inventory_reservations.findFirst({
        where: { shopping_mall_sale_sku_id: sku.id },
      }),
    ]);

  if (inventoryStocks) {
    throw new HttpException(
      "Cannot delete SKU with existing inventory stock records",
      400,
    );
  }

  if (cartItems) {
    throw new HttpException("Cannot delete SKU that is in shopping carts", 400);
  }

  if (orderItems) {
    throw new HttpException("Cannot delete SKU that is part of orders", 400);
  }

  if (inventoryReservations) {
    throw new HttpException(
      "Cannot delete SKU with active inventory reservations",
      400,
    );
  }

  await MyGlobal.prisma.shopping_mall_sale_skus.delete({
    where: { id: sku.id },
  });

  const [seller, category, saleImages] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: sale.shopping_mall_seller_id },
    }),
    MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: sale.shopping_mall_category_id },
    }),
    MyGlobal.prisma.shopping_mall_sale_images.findFirst({
      where: {
        shopping_mall_sale_id: sale.id,
        is_primary: true,
      },
    }),
  ]);

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  return {
    id: sku.id,
    shopping_mall_sale_id: sku.shopping_mall_sale_id,
    sku_code: sku.sku_code,
    variant_combination: sku.variant_combination,
    base_price: Number(sku.base_price),
    compare_at_price:
      sku.compare_at_price !== null ? Number(sku.compare_at_price) : undefined,
    sale_price: sku.sale_price !== null ? Number(sku.sale_price) : undefined,
    sale_start_at: sku.sale_start_at
      ? toISOStringSafe(sku.sale_start_at)
      : undefined,
    sale_end_at: sku.sale_end_at ? toISOStringSafe(sku.sale_end_at) : undefined,
    cost_price: sku.cost_price !== null ? Number(sku.cost_price) : undefined,
    barcode: sku.barcode !== null ? sku.barcode : undefined,
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
      brand: sale.brand !== null ? sale.brand : undefined,
      short_description:
        sale.short_description !== null ? sale.short_description : undefined,
      price: Number(sku.base_price),
      thumbnail_url: saleImages?.url_thumbnail ?? undefined,
      return_policy_days: sale.return_policy_days,
      warranty_info:
        sale.warranty_info !== null ? sale.warranty_info : undefined,
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
          category.description !== null ? category.description : undefined,
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
