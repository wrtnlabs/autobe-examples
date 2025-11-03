import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingCustomer> {
  const { customer, customerId } = props;

  const found = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: customerId },
  });
  if (!found) throw new HttpException("Customer not found", 404);
  if (found.id !== customer.id) throw new HttpException("Forbidden", 403);
  if (!found.is_active) throw new HttpException("Account inactive", 403);
  if (found.deleted_at !== null && found.deleted_at !== undefined)
    throw new HttpException("Account deleted", 403);

  return {
    id: found.id,
    email: found.email,
    name: found.name,
    phone: found.phone,
    is_active: found.is_active,
    deleted_at:
      found.deleted_at === null || found.deleted_at === undefined
        ? null
        : toISOStringSafe(found.deleted_at),
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
