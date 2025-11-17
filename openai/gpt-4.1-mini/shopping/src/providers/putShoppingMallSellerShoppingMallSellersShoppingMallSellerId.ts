import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerShoppingMallSellersShoppingMallSellerId(props: {
  seller: SellerPayload;
  shoppingMallSellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.shoppingMallSellerId },
  });

  if (!existing) {
    throw new HttpException("Seller not found", 404);
  }

  if (existing.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.shoppingMallSellerId },
    data: {
      email: props.body.email ?? existing.email,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
