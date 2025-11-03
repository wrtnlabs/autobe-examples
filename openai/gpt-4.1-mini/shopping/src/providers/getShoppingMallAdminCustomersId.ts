import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCustomersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  const { id } = props;

  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id },
    });

  if (customer.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: customer.id,
    email: customer.email,
    password_hash: customer.password_hash,
    nickname: customer.nickname,
    created_at: toISOStringSafe(customer.created_at),
    updated_at: toISOStringSafe(customer.updated_at),
    deleted_at: null,
  };
}
