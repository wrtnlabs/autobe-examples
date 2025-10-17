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

export async function postAuthCustomerLogout(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.ILogout;
}): Promise<IShoppingMallCustomer.ILogoutResponse> {
  const { customer, body } = props;

  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      refresh_token: body.refresh_token,
      customer_id: customer.id,
      is_revoked: false,
    },
  });

  if (session) {
    await MyGlobal.prisma.shopping_mall_sessions.update({
      where: {
        id: session.id,
      },
      data: {
        is_revoked: true,
        revoked_at: toISOStringSafe(new Date()),
      },
    });
  }

  return {
    message: "Successfully logged out. Session has been terminated.",
  };
}
