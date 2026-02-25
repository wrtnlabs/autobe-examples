import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string;
}): Promise<IShoppingMallCategory> {
  const user = await MyGlobal.prisma.shopping_mall_users.findUniqueOrThrow({
    where: {
      id: props.customerId,
      user_type: "customer",
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      select: {
        display_name: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: user.id,
    display_name:
      customer.display_name === null ? undefined : customer.display_name,
    shop_name: undefined,
    status: undefined,
    email: user.email === null ? undefined : user.email,
    phone_number:
      customer.phone_number === null ? undefined : customer.phone_number,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: customer.updated_at
      ? toISOStringSafe(customer.updated_at)
      : undefined,
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
  } satisfies IShoppingMallCategory;
}
