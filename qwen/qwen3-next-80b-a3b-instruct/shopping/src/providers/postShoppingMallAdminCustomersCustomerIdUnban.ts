import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminCustomersCustomerIdUnban(props: {
  admin: AdminPayload;
  customerId: string;
}): Promise<void> {
  // Verify admin role via props.admin (already enforced by decorator)
  // Update customer's status to active (unban) by setting disabled_at to null
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: props.customerId,
    },
    data: {
      disabled_at: null,
    },
  });
  // If no customer was updated, customerId doesn't exist
  if (updated === null) {
    throw new HttpException("Customer not found", 404);
  }
}
