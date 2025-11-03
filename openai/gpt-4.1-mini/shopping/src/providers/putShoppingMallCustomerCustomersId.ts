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

  if (customer.id !== id) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }

  const existing = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id },
  });
  if (existing === null) {
    throw new HttpException("Customer not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      nickname: body.nickname ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    nickname: updated.nickname,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
