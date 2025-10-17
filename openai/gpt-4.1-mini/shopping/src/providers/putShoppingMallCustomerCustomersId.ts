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

export async function putShoppingMallCustomerCustomersId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const { customer, id, body } = props;

  // Authorization check: only the owner can update their info
  if (customer.id !== id) {
    throw new HttpException(
      "Unauthorized: Cannot update other customer accounts",
      403,
    );
  }

  // Find existing customer record, throw if not found
  const existing =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id },
    });

  // Prepare update data
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id },
    data: {
      nickname: body.nickname ?? null,
      phone_number: body.phone_number ?? null,
      status: body.status,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    nickname: updated.nickname ?? null,
    phone_number: updated.phone_number ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
