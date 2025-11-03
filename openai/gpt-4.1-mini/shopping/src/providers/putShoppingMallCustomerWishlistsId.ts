import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerWishlistsId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallWishlist.IUpdate;
}): Promise<IShoppingMallWishlist> {
  const { customer, id, body } = props;

  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You can only update your own wishlist",
      403,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id },
    data: {
      shopping_mall_customer_id: body.shopping_mall_customer_id,
      shopping_mall_customer_session_id: body.shopping_mall_customer_session_id,
      created_at: body.created_at
        ? toISOStringSafe(body.created_at)
        : undefined,
      updated_at: body.updated_at
        ? toISOStringSafe(body.updated_at)
        : undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
    },
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_customer_session_id:
      updated.shopping_mall_customer_session_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
