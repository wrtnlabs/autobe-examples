import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCustomersCustomerIdSessionsSessionId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: props.sessionId,
        shopping_mall_customer_id: props.customerId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found for this customer", 404);
  }

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.customerId },
    select: { id: true, name: true },
  });
  if (!customer) {
    throw new HttpException("Customer not found for this session", 404);
  }

  return {
    id: session.id,
    customer: {
      id: customer.id,
      name: customer.name,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : undefined,
  };
}
