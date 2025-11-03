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

export async function putShoppingAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingCustomer.IUpdate;
}): Promise<IShoppingCustomer> {
  const customer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: props.customerId },
  });
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Customer not found or has been deleted", 404);
  }

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
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : (updated.deleted_at ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
