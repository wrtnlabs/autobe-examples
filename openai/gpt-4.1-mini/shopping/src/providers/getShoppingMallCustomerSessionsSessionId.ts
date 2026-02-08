import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
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

export async function getShoppingMallCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: props.sessionId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (!session) throw new HttpException("Session not found", 404);
  if (session.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: session.id,
    shoppingMallCustomerId: session.shopping_mall_customer_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    createdAt: session.created_at,
    expiredAt: session.expired_at,
  };
}
