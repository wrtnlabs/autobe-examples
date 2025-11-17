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

export async function getShoppingMallAdminShoppingMallSellersShoppingMallSellerId(props: {
  admin: AdminPayload;
  shoppingMallSellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const record = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.shoppingMallSellerId },
  });

  if (!record) {
    throw new HttpException("Shopping mall seller not found", 404);
  }

  return {
    id: record.id,
    email: record.email,
    password_hash: record.password_hash ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
