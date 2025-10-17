import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlist.IUpdate;
}): Promise<IShoppingMallWishlist> {
  const { customer, wishlistId, body } = props;

  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: { id: wishlistId },
    });

  if (wishlist.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Forbidden: You can only update your own wishlist",
      403,
    );
  }

  const updateData: {
    shopping_mall_customer_id: string & tags.Format<"uuid">;
    updated_at?: string | undefined;
  } = {
    shopping_mall_customer_id: body.shopping_mall_customer_id,
  };

  if (body.updated_at !== null && body.updated_at !== undefined) {
    updateData.updated_at = body.updated_at;
  }

  const updated = await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: wishlistId },
    data: updateData,
  });

  return {
    id: updated.id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : "",
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : "",
  };
}
