import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function putShoppingMallCustomerCustomersProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // Verify customer account exists and is not deleted
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { id: true, deleted_at: true },
    });
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Build update data
  const updateData: Prisma.shopping_mall_customersUpdateInput = {
    ...(props.body.displayName !== undefined && {
      nickname: props.body.displayName,
    }),
    ...(props.body.phoneNumber !== undefined && {
      phone_number: props.body.phoneNumber,
    }),
    updated_at: new Date(),
  };
  // Update customer profile
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customer.id },
    data: updateData,
  });
  // Fetch and return updated customer profile
  const updated =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      ...ShoppingMallCustomerTransformer.select(),
    });
  return await ShoppingMallCustomerTransformer.transform(updated);
}
