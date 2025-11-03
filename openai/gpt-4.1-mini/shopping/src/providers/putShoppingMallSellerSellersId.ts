import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerSellersId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  const { seller, id, body } = props;

  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  });

  if (!existingSeller) {
    throw new HttpException("Seller not found", 404);
  }

  if (seller.id !== id) {
    throw new HttpException(
      "Unauthorized: you can only update your own profile",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      store_name: body.store_name ?? undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    store_name: updated.store_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at !== undefined
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}
