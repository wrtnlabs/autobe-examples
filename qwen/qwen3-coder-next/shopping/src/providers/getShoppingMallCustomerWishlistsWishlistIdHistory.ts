import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getShoppingMallCustomerWishlistsWishlistIdHistory(props: {
  customer: CustomerPayload;
  wishlistId: string;
}): Promise<IShoppingMallWishlistHistory> {
  // Verify that the wishlist exists and belongs to the authenticated customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }
  // Retrieve all history records for this wishlist, sorted by created_at (newest first)
  const historyRecords =
    await MyGlobal.prisma.shopping_mall_wishlist_histories.findMany({
      where: {
        wishlist_id: props.wishlistId,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  // Transform database records to response DTO format
  return historyRecords.map((record) => ({
    id: record.id,
    wishlist_id: record.wishlist_id,
    action_type: record.action_type,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
  }));
}
