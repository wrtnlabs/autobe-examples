import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminSellersSellerIdUnsuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const seller = await tx.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      select: {
        id: true,
        is_banned: true,
        is_suspended: true,
      },
    });
    if (seller.is_banned) {
      throw new HttpException("Cannot unsuspend a banned seller account.", 422);
    }
    if (!seller.is_suspended) {
      throw new HttpException(
        "The seller account is not currently suspended.",
        422,
      );
    }
    await tx.shopping_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        is_suspended: false,
        updated_at: new Date(),
      },
    });
    const updated = await tx.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    });
    return await ShoppingMallSellerTransformer.transform(updated);
  });
}
