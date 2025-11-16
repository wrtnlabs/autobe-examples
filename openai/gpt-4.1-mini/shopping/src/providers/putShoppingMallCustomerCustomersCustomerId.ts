import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCustomersCustomerId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const existing = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Customer not found", 404);
  }

  if (props.body.email !== undefined && props.body.email !== existing.email) {
    const conflict = await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email: props.body.email, deleted_at: null },
    });

    if (conflict !== null) {
      throw new HttpException("Email already in use", 400);
    }
  }

  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      email: props.body.email ?? existing.email,
      name: props.body.name ?? existing.name,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    full_name: updated.name,
    created_at: toISOStringSafe(new Date(updated.created_at)),
    updated_at: toISOStringSafe(new Date(updated.updated_at)),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(new Date(updated.deleted_at))
        : null,
  } satisfies IShoppingMallCustomer;
}
