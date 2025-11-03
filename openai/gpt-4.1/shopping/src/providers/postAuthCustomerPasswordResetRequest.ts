import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

export async function postAuthCustomerPasswordResetRequest(props: {
  body: IShoppingCustomer.IRequestPasswordReset;
}): Promise<IShoppingCustomer.IPasswordResetInitiated> {
  const email = props.body.request_email.toLowerCase();
  const now = toISOStringSafe(new Date());
  const expires = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60)); // 1 hour from now
  const resetCode = v4();

  const customer = await MyGlobal.prisma.shopping_customers.findFirst({
    where: {
      email: email,
      is_active: true,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (customer) {
    await MyGlobal.prisma.shopping_password_resets.create({
      data: {
        id: v4(),
        shopping_customer_id: customer.id,
        request_email: email,
        reset_code: resetCode,
        expires_at: expires,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return { confirmation: true };
}
