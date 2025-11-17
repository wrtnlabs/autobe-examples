import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallCustomersShoppingMallCustomerIdShoppingMallCustomerSessionsShoppingMallCustomerSessionId(props: {
  admin: AdminPayload;
  shoppingMallCustomerId: string & tags.Format<"uuid">;
  shoppingMallCustomerSessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: {
        id: props.shoppingMallCustomerSessionId,
        shopping_mall_customer_id: props.shoppingMallCustomerId,
      },
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

  if (!session) {
    throw new HttpException("Shopping mall customer session not found.", 404);
  }

  return {
    id: session.id,
    shopping_mall_customer_id: session.shopping_mall_customer_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    is_active: false,
    device_info: "",
    user_agent: "",
  };
}
