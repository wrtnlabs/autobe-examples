import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlist.IUpdate;
}): Promise<IShoppingMallWishlist> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
  });
  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: props.wishlistId },
    data: { updated_at: props.body.updated_at },
  });
  // Fetch summary info for the customer
  const customerSummary =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: updated.shopping_mall_customer_id },
      select: { id: true, name: true },
    });
  if (customerSummary === null) {
    throw new HttpException("Customer not found", 500);
  }
  return {
    id: updated.id,
    customer: {
      id: customerSummary.id,
      name: customerSummary.name,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
