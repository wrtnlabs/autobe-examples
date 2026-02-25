import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminCustomersCustomerIdBan(props: {
  admin: AdminPayload;
  customerId: string;
  body: IShoppingMallCustomer.IBan;
}): Promise<IShoppingMallCustomer> {
  // 1. Find customer (404 if not found - handled by findUniqueOrThrow)
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      ...ShoppingMallCustomerTransformer.select(),
    });
  // 2. Idempotency check - query audit log for latest ban/unban action
  const latestBanAction =
    await MyGlobal.prisma.shopping_mall_admin_audit_logs.findFirst({
      where: {
        target_type: "customer",
        target_id: props.customerId,
        action: { in: ["customer_ban", "customer_unban"] },
      },
      orderBy: { created_at: "desc" },
      select: { action: true },
    });
  // If already banned (latest action is customer_ban), return customer without changes
  if (latestBanAction !== null && latestBanAction.action === "customer_ban") {
    return ShoppingMallCustomerTransformer.transform(customer);
  }
  // 3. Get admin's IP from session
  const adminSession =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findUniqueOrThrow({
      where: { id: props.admin.session_id },
      select: { ip: true },
    });
  // 4. Invalidate all customer sessions (prevent further API access)
  await MyGlobal.prisma.shopping_mall_customer_sessions.deleteMany({
    where: { shopping_mall_customer_id: props.customerId },
  });
  // 5. Create audit log entry
  await MyGlobal.prisma.shopping_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: props.admin.id,
      action: "customer_ban",
      target_type: "customer",
      target_id: props.customerId,
      details: JSON.stringify({ reason: props.body.reason }),
      ip: adminSession.ip,
      created_at: new Date(),
    },
  });
  // 6. Return the customer
  return ShoppingMallCustomerTransformer.transform(customer);
}
