import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const { customer, wishlistId, body } = props;

  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: wishlistId },
    select: { shopping_mall_customer_id: true, deleted_at: true },
  });

  if (!wishlist || wishlist.deleted_at !== null) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: Not the owner of the wishlist", 403);
  }

  if (body.delete_item_ids && body.delete_item_ids.length > 0) {
    await Promise.all(
      body.delete_item_ids.map(async (itemId) => {
        const deleted =
          await MyGlobal.prisma.shopping_mall_wishlist_items.deleteMany({
            where: {
              id: itemId,
              shopping_mall_wishlist_id: wishlistId,
            },
          });
      }),
    );
  }

  if (body.update_items && body.update_items.length > 0) {
    await Promise.all(
      body.update_items.map(async (updateItem) => {
        if (updateItem.id) {
          const existing =
            await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst({
              where: {
                id: updateItem.id,
                shopping_mall_wishlist_id: wishlistId,
              },
              select: { id: true },
            });
          if (existing) {
            await MyGlobal.prisma.shopping_mall_wishlist_items.update({
              where: { id: updateItem.id },
              data: {
                shopping_mall_product_sku_id:
                  updateItem.shopping_mall_product_sku_id,
                quantity: updateItem.quantity,
                updated_at: toISOStringSafe(new Date()),
                deleted_at:
                  updateItem.deleted_at === null
                    ? null
                    : (updateItem.deleted_at ?? undefined),
              },
            });
          }
        }
      }),
    );
  }

  const whereCondition = {
    shopping_mall_wishlist_id: wishlistId,
    deleted_at: null,
    ...(body.filter_shopping_mall_customer_session_id !== undefined &&
      body.filter_shopping_mall_customer_session_id !== null && {
        shopping_mall_customer_session_id:
          body.filter_shopping_mall_customer_session_id,
      }),
    ...(body.filter_shopping_mall_product_sku_id !== undefined &&
      body.filter_shopping_mall_product_sku_id !== null && {
        shopping_mall_product_sku_id: body.filter_shopping_mall_product_sku_id,
      }),
    ...(body.filter_shopping_mall_product_sku_ids !== undefined &&
      body.filter_shopping_mall_product_sku_ids !== null && {
        shopping_mall_product_sku_id: {
          in: body.filter_shopping_mall_product_sku_ids,
        },
      }),
  };

  const orderBy =
    body.sort_field === "quantity"
      ? {
          quantity: (body.sort_order === "asc" ? "asc" : "desc") satisfies
            | "asc"
            | "desc" as "asc" | "desc",
        }
      : {
          created_at: (body.sort_order === "asc" ? "asc" : "desc") satisfies
            | "asc"
            | "desc" as "asc" | "desc",
        };

  const page: number & tags.Type<"int32"> & tags.Minimum<0> = (body.page ??
    1) satisfies number as number;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> = (body.limit ??
    10) satisfies number as number;

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      shopping_mall_wishlist_id: item.shopping_mall_wishlist_id,
      shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
      quantity: item.quantity,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
