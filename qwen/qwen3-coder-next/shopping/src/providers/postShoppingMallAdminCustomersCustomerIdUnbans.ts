import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCustomersCustomerIdUnbans(props: {
  admin: AdminPayload;
  customerId: string;
}): Promise<void> {
  const bannedCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: {
        id: props.customerId,
        deleted_at: null,
      },
    });
  if (bannedCustomer === null) {
    throw new HttpException("Customer not found or already active", 404);
  }
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      email_verified: true,
      updated_at: new Date(),
    },
  });
}
