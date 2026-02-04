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

export async function postShoppingMallAdminCustomersCustomerIdBan(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch customer record
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
  });
  // Customer not found
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  // Customer already banned (inferred from deleted_at not null)
  if (customer.deleted_at !== null) {
    throw new HttpException("Customer is already banned", 409);
  }
  // Update customer to banned status by setting deleted_at to current date
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: props.customerId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
