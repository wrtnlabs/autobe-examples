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

export async function putShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // Check if account is banned
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { id: true, status: true },
    });
  if (customer.status === "banned") {
    throw new HttpException("Access denied", 403);
  }
  // Get current values to check for changes
  const current =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { display_name: true, phone_number: true },
    });
  // Validate at least one field is provided and different
  const hasDisplayNameChange =
    props.body.display_name !== undefined &&
    props.body.display_name !== current.display_name;
  const hasPhoneNumberChange =
    props.body.phone_number !== undefined &&
    props.body.phone_number !== current.phone_number;
  if (!hasDisplayNameChange && !hasPhoneNumberChange) {
    throw new HttpException("No fields to update", 400);
  }
  // Update the customer profile
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customer.id },
    data: {
      ...(hasDisplayNameChange && { display_name: props.body.display_name }),
      ...(hasPhoneNumberChange && { phone_number: props.body.phone_number }),
      updated_at: new Date(),
    },
    ...ShoppingMallCustomerTransformer.select(),
  });
  return await ShoppingMallCustomerTransformer.transform(updated);
}
