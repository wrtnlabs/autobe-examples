import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function getShoppingMallBuyerBuyersMeWishlistItemsWishlistItemId(props: {
  buyer: BuyerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: { id: props.wishlistItemId },
    });

  if (!wishlistItem) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (wishlistItem.deleted_at !== null) {
    throw new HttpException("Wishlist item not found", 404);
  }

  if (wishlistItem.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: wishlistItem.shopping_mall_buyer_id },
  });

  if (!buyer) {
    throw new HttpException("Buyer not found", 404);
  }

  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
    where: { id: wishlistItem.shopping_mall_sale_sku_id },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: sku.shopping_mall_sale_id },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
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

  const currentPrice =
    sku.sale_price !== null ? sku.sale_price : sku.base_price;

  return {
    id: wishlistItem.id,
    shopping_mall_buyer_id: wishlistItem.shopping_mall_buyer_id,
    shopping_mall_sale_sku_id: wishlistItem.shopping_mall_sale_sku_id,
    buyer: {
      id: buyer.id,
      email: buyer.email,
      full_name: buyer.full_name,
      phone_number:
        buyer.phone_number === null ? undefined : buyer.phone_number,
    },
    sku: {
      id: sku.id,
      sku_code: sku.sku_code,
      variant_combination: sku.variant_combination,
      base_price: sku.base_price,
      price: currentPrice,
      enabled: sku.enabled,
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
        price: currentPrice,
        thumbnail_url: undefined,
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
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(seller.status),
          email_verified: seller.email_verified,
        },
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description:
            category.description === null ? undefined : category.description,
          image_url:
            category.image_url === null ? undefined : category.image_url,
          parent_id:
            category.parent_id === null ? undefined : category.parent_id,
          status: category.status,
          display_order: category.display_order,
          product_count: category.product_count,
          created_at: toISOStringSafe(category.created_at),
          updated_at: toISOStringSafe(category.updated_at),
        },
      },
    },
    price_snapshot: wishlistItem.price_snapshot,
    created_at: toISOStringSafe(wishlistItem.created_at),
    updated_at: toISOStringSafe(wishlistItem.updated_at),
    deleted_at: wishlistItem.deleted_at
      ? toISOStringSafe(wishlistItem.deleted_at)
      : undefined,
  };
}
