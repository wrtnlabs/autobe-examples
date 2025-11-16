import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCustomersCustomerIdCustomerSessionsCustomerSessionId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  customerSessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: props.customerSessionId,
        shopping_mall_customer_id: props.customerId,
      },
    });

  if (!session) {
    throw new HttpException("Customer session not found", 404);
  }

  return {
    id: session.id,
    shopping_mall_customer_id: session.shopping_mall_customer_id,
    ip: session.ip === null ? undefined : session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expires_at: toISOStringSafe(session.expired_at ?? new Date()),
  };
}
