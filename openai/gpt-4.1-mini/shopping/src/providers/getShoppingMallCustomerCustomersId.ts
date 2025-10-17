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

export async function getShoppingMallCustomerCustomersId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  const { customer, id } = props;

  if (customer.id !== id) {
    throw new HttpException(
      "Forbidden: Cannot access other customer details",
      403,
    );
  }

  const customerRecord =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        nickname: true,
        phone_number: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });

  return {
    id: customerRecord.id,
    email: customerRecord.email,
    nickname: customerRecord.nickname ?? null,
    phone_number: customerRecord.phone_number ?? null,
    status: customerRecord.status,
    created_at: toISOStringSafe(customerRecord.created_at),
    updated_at: toISOStringSafe(customerRecord.updated_at),
    deleted_at: customerRecord.deleted_at
      ? toISOStringSafe(customerRecord.deleted_at)
      : null,
    password_hash: customerRecord.password_hash,
  };
}
