import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const { customer, wishlistId, body } = props;
  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: {
      id: newId,
      shopping_mall_wishlist_id: wishlistId as string & tags.Format<"uuid">,
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      quantity: body.quantity,
      created_at: body.created_at ?? now,
      updated_at: body.updated_at ?? now,
      deleted_at: body.deleted_at ?? null,
    },
    include: {
      productSku: true,
      wishlist: true,
    },
  });

  return {
    id: created.id,
    shopping_mall_wishlist_id: created.shopping_mall_wishlist_id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    quantity: created.quantity,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    productSku: created.productSku
      ? {
          id: created.productSku.id,
          sku_code: created.productSku.sku_code,
          price: created.productSku.price,
          attributes_json: created.productSku.attributes_json ?? null,
          created_at: toISOStringSafe(created.productSku.created_at),
          updated_at: toISOStringSafe(created.productSku.updated_at),
        }
      : undefined,
    wishlist: created.wishlist
      ? {
          id: created.wishlist.id,
          shopping_mall_customer_id: created.wishlist.shopping_mall_customer_id,
          shopping_mall_customer_session_id:
            created.wishlist.shopping_mall_customer_session_id,
          created_at: toISOStringSafe(created.wishlist.created_at),
          updated_at: toISOStringSafe(created.wishlist.updated_at),
          deleted_at: created.wishlist.deleted_at
            ? toISOStringSafe(created.wishlist.deleted_at)
            : null,
          shopping_mall_wishlist_items: [], // Summary, no recursion
        }
      : undefined,
  };
}
