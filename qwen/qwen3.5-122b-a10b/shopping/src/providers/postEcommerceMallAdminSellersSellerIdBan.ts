import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSellersSellerIdBan(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the seller
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: { id: true, account_status: true },
  });
  // Check if seller exists
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  // Check if already banned
  if (seller.account_status === "banned") {
    throw new HttpException("Seller is already banned", 409);
  }
  // Update seller to banned status
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      account_status: "banned",
      updated_at: new Date(),
    },
  });
}
