import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerPasswordReset.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const reset =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findUnique({
      where: {
        token: props.body.token,
      },
      select: {
        id: true,
        expired_at: true,
        consumed_at: true,
        customer: {
          select: {
            id: true,
            banned_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (reset === null) {
    throw new HttpException("Invalid password reset token", 400);
  }
  const now = new Date();
  if (reset.expired_at.getTime() <= now.getTime()) {
    throw new HttpException("Expired password reset token", 400);
  }
  if (reset.consumed_at !== null) {
    throw new HttpException("Password reset token already consumed", 400);
  }
  if (reset.customer.deleted_at !== null) {
    throw new HttpException(
      "Deleted customer accounts cannot recover credentials",
      403,
    );
  }
  if (reset.customer.banned_at !== null) {
    throw new HttpException(
      "Banned customer accounts cannot recover credentials",
      403,
    );
  }
  const passwordHash = await PasswordUtil.hash(props.body.password);
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_customers.update({
      where: {
        id: reset.customer.id,
      },
      data: {
        password_hash: passwordHash,
        updated_at: now,
      },
    });
    await tx.shopping_mall_customer_password_resets.update({
      where: {
        id: reset.id,
      },
      data: {
        consumed_at: now,
        updated_at: now,
      },
    });
  });
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: {
        id: reset.customer.id,
      },
      ...ShoppingMallCustomerTransformer.select(),
    });
  return await ShoppingMallCustomerTransformer.transform(customer);
}
