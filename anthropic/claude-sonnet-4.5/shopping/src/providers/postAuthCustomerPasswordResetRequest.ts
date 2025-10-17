import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postAuthCustomerPasswordResetRequest(props: {
  body: IShoppingMallCustomer.IPasswordResetRequest;
}): Promise<IShoppingMallCustomer.IPasswordResetRequestResponse> {
  const { body } = props;

  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (customer) {
    const resetToken = v4() as string & tags.Format<"uuid">;
    const expirationTime = new Date(Date.now() + 60 * 60 * 1000);
    const expiresAt = toISOStringSafe(expirationTime);

    await MyGlobal.prisma.shopping_mall_customers.update({
      where: {
        id: customer.id,
      },
      data: {
        password_reset_token: resetToken,
        password_reset_expires_at: expiresAt,
      },
    });
  }

  return {
    message:
      "If an account exists with that email address, you will receive password reset instructions.",
  };
}
