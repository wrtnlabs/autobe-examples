import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postShoppingMallActorsCustomers(props: {
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      status: "pending_verification",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      password_hash: "", // Add required password_hash field with empty string default
    },
  });

  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    status: customer.status,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
  };
}
