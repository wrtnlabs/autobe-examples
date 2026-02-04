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

export async function postShoppingMallAdminAdminsCustomersCustomerIdBan(props: {
  admin: AdminPayload;
  customerId: string;
}): Promise<void> {
  // Verify admin has sufficient privileges (admin or superAdmin type)
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden - insufficient privileges", 403);
  }
  // Find customer by customerId
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
  });
  // Return 404 if customer not found
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  // Update isBanned to true (correct field name based on schema - camelCase)
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: { isBanned: true },
  });
  // Return 204 No Content on success
  return;
}
