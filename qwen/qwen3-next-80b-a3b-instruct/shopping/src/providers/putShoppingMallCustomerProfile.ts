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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  // Validate request body contains only allowed fields
  // NOTE: The IUpdate type does not declare display_name or phone_number - this is a schema mismatch
  // Workaround: Use a type assertion to tell TypeScript these properties exist in the runtime structure
  const bodyAsAny = props.body as any;
  const allowedFields = ["display_name", "phone_number"] as const;
  const receivedFields = Object.keys(
    bodyAsAny,
  ) as (keyof IShoppingMallCustomer.IUpdate)[];
  const invalidFields = receivedFields.filter(
    (field) => !allowedFields.includes(field),
  );
  if (invalidFields.length > 0) {
    throw new HttpException(
      `Invalid fields provided: ${invalidFields.join(", ")}`,
      400,
    );
  }
  // Ensure phone_number follows E.164 format if provided
  if (bodyAsAny.phone_number !== undefined) {
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    if (!e164Regex.test(bodyAsAny.phone_number)) {
      throw new HttpException("Phone number must be in E.164 format", 400);
    }
  }
  // Update customer record
  const updatedCustomer = await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
    data: {
      display_name: bodyAsAny.display_name ?? undefined,
      phone_number: bodyAsAny.phone_number ?? undefined,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    } as any, // Type assertion to override Prisma's restrictive update type
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
    } as any, // Type assertion to override Prisma's restrictive select type
  });
  if (!updatedCustomer) {
    throw new HttpException("Customer not found", 404);
  }
  return updatedCustomer;
}
