import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postShoppingMallCustomers(props: {
  body: IShoppingMallCustomer.ICreate;
}): Promise<IShoppingMallCustomer> {
  const now = toISOStringSafe(new Date());
  const id = v4();

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const created = await MyGlobal.prisma.shopping_mall_customers.create({
    data: {
      id: id as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      name: props.body.full_name,
      created_at: now as string & tags.Format<"date-time">,
      updated_at: now as string & tags.Format<"date-time">,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    full_name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
