import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallCustomersShoppingMallCustomerId(props: {
  customer: CustomerPayload;
  shoppingMallCustomerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.shoppingMallCustomerId },
  });

  if (!existing) {
    throw new HttpException("Customer not found", 404);
  }

  if (props.customer.id !== props.shoppingMallCustomerId) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_customers.delete({
    where: { id: props.shoppingMallCustomerId },
  });
}
