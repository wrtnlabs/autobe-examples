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
}): Promise<IPageIShoppingMallWishlistItem> {
  const { customer, wishlistId, body } = props;

  // STEP 1: Verify wishlist ownership - MANDATORY authorization check
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException(
      "Unauthorized: Wishlist not found or you do not have access to this wishlist",
      403,
    );
  }

  // STEP 2: Extract and validate pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // STEP 3: Query wishlist items with pagination
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: {
        shopping_mall_wishlist_id: wishlistId,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: {
        shopping_mall_wishlist_id: wishlistId,
      },
    }),
  ]);

  // STEP 4: Transform to API response format
  const data: IShoppingMallWishlistItem[] = items.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(item.created_at),
  }));

  // STEP 5: Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  // STEP 6: Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
