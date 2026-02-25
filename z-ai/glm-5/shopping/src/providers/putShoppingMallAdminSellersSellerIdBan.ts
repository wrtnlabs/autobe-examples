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

export async function putShoppingMallAdminSellersSellerIdBan(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the seller and verify not deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: {
      approval_status: true,
      deleted_at: true,
    },
  });
  // Check if seller is deleted
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account has been deleted", 410);
  }
  // Check if already suspended
  if (seller.approval_status === "suspended") {
    throw new HttpException("Seller is already suspended", 409);
  }
  // Update seller status to suspended
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: "suspended",
      updated_at: new Date(),
    },
  });
  // Invalidate all active sessions
  await MyGlobal.prisma.shopping_mall_seller_sessions.deleteMany({
    where: { shopping_mall_seller_id: props.sellerId },
  });
}
