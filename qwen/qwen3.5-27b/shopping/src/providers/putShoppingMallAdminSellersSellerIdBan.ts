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
  // Step 1: Verify seller exists and check current status
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
  // Step 2: Check if already banned - return 409 conflict
  if (seller.status === "banned") {
    throw new HttpException("Seller is already banned", 409);
  }
  // Step 3: Update seller status to banned
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: {
      id: props.sellerId,
    },
    data: {
      status: "banned",
      updated_at: new Date(),
    },
  });
  // Step 4: Invalidate all active seller sessions
  await MyGlobal.prisma.shopping_mall_seller_sessions.updateMany({
    where: {
      shopping_mall_seller_id: props.sellerId,
      revoked_at: null,
    },
    data: {
      revoked_at: new Date(),
    },
  });
  // Step 5: Fetch and return updated seller record using transformer
  const updatedSeller =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: {
        id: props.sellerId,
      },
      ...ShoppingMallSellerTransformer.select(),
    });
  return await ShoppingMallSellerTransformer.transform(updatedSeller);
}
