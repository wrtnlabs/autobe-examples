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

export async function putShoppingMallCustomerShoppingMallCustomersShoppingMallCustomerId(props: {
  customer: CustomerPayload;
  shoppingMallCustomerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: props.shoppingMallCustomerId },
    });

  if (existingCustomer === null) {
    throw new HttpException("Customer not found", 404);
  }

  if (props.customer.id !== props.shoppingMallCustomerId) {
    throw new HttpException("Forbidden", 403);
  }

  const updatedCustomer = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.shoppingMallCustomerId },
    data: {
      email: props.body.email ?? existingCustomer.email,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedCustomer.id,
    email: updatedCustomer.email,
    created_at: toISOStringSafe(updatedCustomer.created_at),
    updated_at: toISOStringSafe(updatedCustomer.updated_at),
  };
}
