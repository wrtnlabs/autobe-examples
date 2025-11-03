import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingCustomerCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Only account owner can delete own account
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Unauthorized: You can only delete your own account",
      403,
    );
  }

  // Fetch customer, ensure not already deleted
  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: props.customerId },
  });
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException(
      "Customer account does not exist or is already deleted",
      404,
    );
  }

  // Timestamp for deletion
  const now = toISOStringSafe(new Date());

  // Remove all sessions
  await MyGlobal.prisma.shopping_customer_sessions.deleteMany({
    where: { shopping_customer_id: props.customerId },
  });
  // Remove all addresses
  await MyGlobal.prisma.shopping_customer_addresses.deleteMany({
    where: { shopping_customer_id: props.customerId },
  });
  // Remove all user emails
  await MyGlobal.prisma.shopping_user_emails.deleteMany({
    where: { shopping_customer_id: props.customerId },
  });
  // Remove cart
  await MyGlobal.prisma.shopping_carts.deleteMany({
    where: { shopping_customer_id: props.customerId },
  });
  // Remove wishlist
  await MyGlobal.prisma.shopping_wishlists.deleteMany({
    where: { shopping_customer_id: props.customerId },
  });
  // (Orders, reviews, audit logs retained per compliance)

  // Mark account as deleted (soft delete)
  await MyGlobal.prisma.shopping_customers.update({
    where: { id: props.customerId },
    data: {
      deleted_at: now,
      is_active: false,
      updated_at: now,
    },
  });
}
