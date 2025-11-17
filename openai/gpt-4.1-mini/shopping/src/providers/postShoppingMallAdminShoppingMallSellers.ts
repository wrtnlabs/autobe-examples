import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminShoppingMallSellers(props: {
  admin: AdminPayload;
  body: IShoppingMallSeller.ICreate;
}): Promise<IShoppingMallSeller> {
  const id = v4();
  const passwordHash = await PasswordUtil.hash(props.body.password);

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_sellers.create({
    data: {
      id: id as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
