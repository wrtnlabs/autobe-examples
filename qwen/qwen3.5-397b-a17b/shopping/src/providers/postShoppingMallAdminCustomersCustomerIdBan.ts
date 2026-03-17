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

export async function postShoppingMallAdminCustomersCustomerIdBan(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify customer exists (throws 404 if not found)
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: { id: props.customerId },
  });
  // Update customer's banned status using deleted_at (idempotent operation)
  // Setting deleted_at prevents login per adminAuthorize pattern (checks deleted_at: null)
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Terminate all active sessions for the customer
  await MyGlobal.prisma.shopping_mall_customer_sessions.deleteMany({
    where: { shopping_mall_customer_id: props.customerId },
  });
}
