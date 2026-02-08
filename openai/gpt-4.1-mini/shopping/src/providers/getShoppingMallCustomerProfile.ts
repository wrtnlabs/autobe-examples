import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCustomer> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
    },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  return {
    id: customer.id,
    email: customer.email,
    displayName: customer.display_name,
    phoneNumber: customer.phone_number,
  };
}
