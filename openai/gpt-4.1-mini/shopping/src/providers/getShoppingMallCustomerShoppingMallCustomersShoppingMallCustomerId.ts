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

export async function getShoppingMallCustomerShoppingMallCustomersShoppingMallCustomerId(props: {
  customer: CustomerPayload;
  shoppingMallCustomerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  const customerRecord =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: props.shoppingMallCustomerId },
    });

  if (customerRecord === null) {
    throw new HttpException("Customer not found", 404);
  }

  return {
    id: customerRecord.id,
    email: customerRecord.email,
    created_at: toISOStringSafe(customerRecord.created_at),
    updated_at: toISOStringSafe(customerRecord.updated_at),
  };
}
