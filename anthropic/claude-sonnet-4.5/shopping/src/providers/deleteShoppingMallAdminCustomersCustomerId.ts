import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, customerId } = props;

  // Verify customer exists
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: customerId },
      select: {
        id: true,
        deleted_at: true,
      },
    });

  // Check if customer is already deleted
  if (customer.deleted_at !== null) {
    throw new HttpException("Customer account is already deleted", 400);
  }

  // Prepare current timestamp for soft delete
  const now = toISOStringSafe(new Date());

  // Soft delete the customer account
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customerId },
    data: {
      deleted_at: now,
    },
  });

  // Revoke all active sessions for this customer
  await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      customer_id: customerId,
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: now,
    },
  });
}
