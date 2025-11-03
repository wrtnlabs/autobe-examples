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

export async function putShoppingCustomerCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingCustomer.IUpdate;
}): Promise<IShoppingCustomer> {
  // Ownership enforcement: only the customer themselves can update their profile
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Forbidden: You cannot update another customer's account",
      403,
    );
  }

  // Fetch the customer (must exist)
  const customer = await MyGlobal.prisma.shopping_customers.findFirst({
    where: { id: props.customerId },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // Forbid update if account is soft-deleted
  if (customer.deleted_at !== null) {
    throw new HttpException("Cannot edit a deleted account", 403);
  }

  // Update allowed mutable fields; skip undefined keys
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_customers.update({
    where: { id: props.customerId },
    data: {
      name: props.body.name ?? undefined,
      phone: props.body.phone ?? undefined,
      is_active: props.body.is_active ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    phone: updated.phone,
    is_active: updated.is_active,
    deleted_at:
      updated.deleted_at !== null && typeof updated.deleted_at !== "undefined"
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
