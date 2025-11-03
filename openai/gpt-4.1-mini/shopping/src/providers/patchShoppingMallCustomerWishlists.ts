import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const { customer, body } = props;

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const createdAtFilter: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    createdAtFilter.gte = body.created_at_from;
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    createdAtFilter.lte = body.created_at_to;
  }

  const updatedAtFilter: {
    gte?: string & tags.Format<"date-time">;
    lte?: string & tags.Format<"date-time">;
  } = {};
  if (body.updated_at_from !== undefined && body.updated_at_from !== null) {
    updatedAtFilter.gte = body.updated_at_from;
  }
  if (body.updated_at_to !== undefined && body.updated_at_to !== null) {
    updatedAtFilter.lte = body.updated_at_to;
  }

  const where = {
    shopping_mall_customer_id: customer.id,
    ...(body.shopping_mall_customer_session_id !== undefined &&
      body.shopping_mall_customer_session_id !== null && {
        shopping_mall_customer_session_id:
          body.shopping_mall_customer_session_id,
      }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(Object.keys(updatedAtFilter).length > 0 && {
      updated_at: updatedAtFilter,
    }),
    ...(body.include_deleted === true ? {} : { deleted_at: null }),
  };

  const [wishlists, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlists.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: { shopping_mall_wishlist_items: true },
    }),
    MyGlobal.prisma.shopping_mall_wishlists.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: wishlists.map((wishlist) => ({
      id: wishlist.id,
      shopping_mall_customer_id: wishlist.shopping_mall_customer_id,
      shopping_mall_customer_session_id:
        wishlist.shopping_mall_customer_session_id,
      created_at: toISOStringSafe(wishlist.created_at),
      updated_at: toISOStringSafe(wishlist.updated_at),
      deleted_at: wishlist.deleted_at
        ? toISOStringSafe(wishlist.deleted_at)
        : null,
      shopping_mall_wishlist_items: wishlist.shopping_mall_wishlist_items.map(
        (item) => ({
          id: item.id,
          shopping_mall_wishlist_id: item.shopping_mall_wishlist_id,
          shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
          quantity: item.quantity,
          created_at: toISOStringSafe(item.created_at),
          updated_at: toISOStringSafe(item.updated_at),
          deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
        }),
      ),
    })),
  };
}
