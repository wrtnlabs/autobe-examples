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
import { ShoppingMallCustomerPasswordResetTransformer } from "../transformers/ShoppingMallCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerPasswordReset;
}): Promise<IShoppingMallCustomerPasswordReset> {
  const reset =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findFirstOrThrow(
      {
        where: {
          id: props.body.id,
          shopping_mall_customer_id: props.customer.id,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_customer_id: true,
          token: true,
          expired_at: true,
          used_at: true,
        },
      },
    );
  if (reset.used_at !== null)
    throw new HttpException("Password reset token already used", 400);
  if (reset.expired_at.getTime() <= new Date().getTime())
    throw new HttpException("Password reset token expired", 400);
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { id: true, password_hash: true },
    });
  const newHash = await PasswordUtil.hash(reset.token);
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_customers.update({
      where: { id: customer.id },
      data: { password_hash: newHash, updated_at: new Date() },
    }),
    MyGlobal.prisma.shopping_mall_customer_password_resets.update({
      where: { id: reset.id },
      data: { used_at: new Date(), updated_at: new Date() },
    }),
  ]);
  const result =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findUniqueOrThrow(
      {
        where: { id: reset.id },
        ...ShoppingMallCustomerPasswordResetTransformer.select(),
      },
    );
  return await ShoppingMallCustomerPasswordResetTransformer.transform(result);
}
