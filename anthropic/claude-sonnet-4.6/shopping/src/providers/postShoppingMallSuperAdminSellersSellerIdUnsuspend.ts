import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminSellersSellerIdUnsuspend(props: {
  superAdmin: SuperadminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: {
      id: true,
      is_suspended: true,
      is_banned: true,
    },
  });
  if (seller.is_suspended === false) {
    throw new HttpException("Seller is not currently suspended", 409);
  }
  if (seller.is_banned === true) {
    throw new HttpException(
      "Seller is banned and cannot be unsuspended via this action",
      409,
    );
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        is_suspended: false,
        updated_at: new Date(),
      },
    });
    return tx.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    });
  });
  return ShoppingMallSellerTransformer.transform(updated);
}
