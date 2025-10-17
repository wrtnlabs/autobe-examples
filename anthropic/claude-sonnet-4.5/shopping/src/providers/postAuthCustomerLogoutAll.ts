import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postAuthCustomerLogoutAll(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallCustomer.ILogoutAllResponse> {
  const { customer } = props;

  const activeSessions = await MyGlobal.prisma.shopping_mall_sessions.count({
    where: {
      customer_id: customer.id,
      is_revoked: false,
    },
  });

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      customer_id: customer.id,
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: now,
    },
  });

  return {
    message:
      "All sessions have been successfully revoked. You are now logged out from all devices.",
    sessions_revoked: Number(activeSessions),
  };
}
