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
  // Get current customer profile
  const current =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: {
        id: true,
        display_name: true,
        phone_number: true,
        status: true,
      },
    });
  // Check if account is banned
  if (current.status === "banned") {
    throw new HttpException("Access denied - account is banned", 403);
  }
  // Validate at least one field is provided
  if (
    props.body.display_name === undefined &&
    props.body.phone_number === undefined
  ) {
    throw new HttpException("At least one field must be provided", 400);
  }
  // Validate display_name is not empty if provided
  if (
    props.body.display_name !== undefined &&
    props.body.display_name.length === 0
  ) {
    throw new HttpException("Display name cannot be empty", 400);
  }
  // Check if any field actually changed
  const hasChanges =
    (props.body.display_name !== undefined &&
      props.body.display_name !== current.display_name) ||
    (props.body.phone_number !== undefined &&
      props.body.phone_number !== current.phone_number);
  if (!hasChanges) {
    throw new HttpException(
      "No changes detected - values must differ from current",
      400,
    );
  }
  // Update the profile
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customer.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
    ...ShoppingMallCustomerTransformer.select(),
  });
  return await ShoppingMallCustomerTransformer.transform(updated);
}
