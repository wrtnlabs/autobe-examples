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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCustomersCustomerIdSessionsSessionId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  // Confirm that actor is requesting their own session only
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "Forbidden: customers may only access their own sessions",
      403,
    );
  }
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: props.sessionId,
        shopping_mall_customer_id: props.customerId,
      },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: session.shopping_mall_customer_id,
    },
    select: {
      id: true,
      name: true,
    },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
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
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
