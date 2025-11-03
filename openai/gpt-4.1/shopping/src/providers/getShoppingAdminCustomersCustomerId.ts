import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingCustomer> {
  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: props.customerId },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    is_active: customer.is_active,
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
  };
}
