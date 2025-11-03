import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: props.customerId },
  });
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Customer not found or already deleted", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete customer
    await tx.shopping_customers.update({
      where: { id: props.customerId },
      data: { deleted_at: now, updated_at: now },
    });
    // Delete all addresses
    await tx.shopping_customer_addresses.deleteMany({
      where: { shopping_customer_id: props.customerId },
    });
    // Delete all sessions
    await tx.shopping_customer_sessions.deleteMany({
      where: { shopping_customer_id: props.customerId },
    });
    // Delete cart items -> cart
    const cart = await tx.shopping_carts.findUnique({
      where: { shopping_customer_id: props.customerId },
    });
    if (cart) {
      await tx.shopping_cart_items.deleteMany({
        where: { shopping_cart_id: cart.id },
      });
      await tx.shopping_carts.delete({
        where: { id: cart.id },
      });
    }
    // Delete wishlist items -> wishlist
    const wishlist = await tx.shopping_wishlists.findUnique({
      where: { shopping_customer_id: props.customerId },
    });
    if (wishlist) {
      await tx.shopping_wishlist_items.deleteMany({
        where: { shopping_wishlist_id: wishlist.id },
      });
      await tx.shopping_wishlists.delete({
        where: { id: wishlist.id },
      });
    }
    // Delete user emails
    await tx.shopping_user_emails.deleteMany({
      where: { shopping_customer_id: props.customerId },
    });
  });
}
