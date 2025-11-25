import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function getShoppingMallActorsCustomersCustomerId(props: {
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });

  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Customer not found", 404);
  }

  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : undefined,
  };
}
