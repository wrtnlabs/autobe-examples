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

export async function putShoppingMallAdminSellersSellerIdBan(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  // Find seller and check if already banned
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Check if already banned
  if (seller.status === "banned") {
    throw new HttpException("Seller is already banned", 409);
  }
  // Ban the seller
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: {
      id: props.sellerId,
    },
    data: {
      status: "banned",
      updated_at: new Date(),
    },
  });
  // Revoke all active sessions
  await MyGlobal.prisma.shopping_mall_seller_sessions.updateMany({
    where: {
      shopping_mall_seller_id: props.sellerId,
      revoked_at: null,
    },
    data: {
      revoked_at: new Date(),
    },
  });
  // Fetch updated seller
  const updatedSeller =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: {
        id: props.sellerId,
      },
      ...ShoppingMallSellerTransformer.select(),
    });
  return await ShoppingMallSellerTransformer.transform(updatedSeller);
}
