import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function postShoppingMallBuyerBuyersMeWishlistItems(props: {
  buyer: BuyerPayload;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const skuId = props.body.shopping_mall_sale_sku_id;
  const buyerId = props.buyer.id;

  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
    where: { id: skuId },
    include: {
      sale: true,
    },
  });

  if (!sku || sku.sale.deleted_at !== null) {
    throw new HttpException("Product SKU not found or unavailable", 404);
  }

  const currentTime = new Date();
  const effectivePrice =
    sku.sale_price !== null &&
    sku.sale_start_at !== null &&
    sku.sale_end_at !== null &&
    currentTime >= sku.sale_start_at &&
    currentTime <= sku.sale_end_at
      ? sku.sale_price
      : sku.base_price;

  const currentTimestamp = toISOStringSafe(currentTime);

  let created;
  try {
    created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_buyer_id: buyerId,
        shopping_mall_sale_sku_id: skuId,
        price_snapshot: effectivePrice,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
      include: {
        buyer: true,
        sku: {
          include: {
            sale: {
              include: {
                seller: true,
                category: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("This product is already in your wishlist", 400);
    }
    throw error;
  }

  return {
    id: created.id,
    shopping_mall_buyer_id: created.shopping_mall_buyer_id,
    shopping_mall_sale_sku_id: created.shopping_mall_sale_sku_id,
    buyer: {
      id: created.buyer.id,
      email: created.buyer.email,
      full_name: created.buyer.full_name,
      phone_number:
        created.buyer.phone_number === null
          ? undefined
          : created.buyer.phone_number,
    },
    sku: {
      id: created.sku.id,
      sku_code: created.sku.sku_code,
      variant_combination: created.sku.variant_combination,
      base_price: created.sku.base_price,
      price: effectivePrice,
      enabled: created.sku.enabled,
      sale: {
        id: created.sku.sale.id,
        code: created.sku.sale.code,
        title: created.sku.sale.title,
        status: created.sku.sale.status as
          | "draft"
          | "pending_approval"
          | "published"
          | "suspended"
          | "archived",
        condition: created.sku.sale.condition as "new" | "refurbished" | "used",
        brand:
          created.sku.sale.brand === null ? undefined : created.sku.sale.brand,
        short_description:
          created.sku.sale.short_description === null
            ? undefined
            : created.sku.sale.short_description,
        price: effectivePrice,
        thumbnail_url: undefined,
        return_policy_days: created.sku.sale.return_policy_days,
        warranty_info:
          created.sku.sale.warranty_info === null
            ? undefined
            : created.sku.sale.warranty_info,
        created_at: toISOStringSafe(created.sku.sale.created_at),
        updated_at: toISOStringSafe(created.sku.sale.updated_at),
        deleted_at:
          created.sku.sale.deleted_at === null
            ? undefined
            : toISOStringSafe(created.sku.sale.deleted_at),
        seller: {
          id: created.sku.sale.seller.id,
          store_name: created.sku.sale.seller.store_name,
          email: created.sku.sale.seller.email,
          status: created.sku.sale.seller.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
          email_verified: created.sku.sale.seller.email_verified,
        },
        category: {
          id: created.sku.sale.category.id,
          name: created.sku.sale.category.name,
          slug: created.sku.sale.category.slug,
          description:
            created.sku.sale.category.description === null
              ? undefined
              : created.sku.sale.category.description,
          image_url:
            created.sku.sale.category.image_url === null
              ? undefined
              : created.sku.sale.category.image_url,
          parent_id:
            created.sku.sale.category.parent_id === null
              ? undefined
              : created.sku.sale.category.parent_id,
          status: created.sku.sale.category.status,
          display_order: created.sku.sale.category.display_order,
          product_count: created.sku.sale.category.product_count,
          created_at: toISOStringSafe(created.sku.sale.category.created_at),
          updated_at: toISOStringSafe(created.sku.sale.category.updated_at),
        },
      },
    },
    price_snapshot: created.price_snapshot,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
