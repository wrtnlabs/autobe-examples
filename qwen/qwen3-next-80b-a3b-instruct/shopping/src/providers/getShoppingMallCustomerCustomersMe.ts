import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
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

export async function getShoppingMallCustomerCustomersMe(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCustomerEmailVerification> {
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        phone_number: true,
      },
    });
  return {
    id: customer.id,
    email: customer.email,
    display_name: customer.display_name ?? undefined,
    phone_number: customer.phone_number ?? undefined,
  };
}
