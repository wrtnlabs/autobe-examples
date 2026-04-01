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

export async function deleteShoppingMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify seller exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: { id: true, deleted_at: true },
  });
  // Check if already deleted
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account is already deleted", 400);
  }
  // Soft delete the seller
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Invalidate all seller sessions
  await MyGlobal.prisma.shopping_mall_seller_sessions.updateMany({
    where: {
      shopping_mall_seller_id: props.sellerId,
    },
    data: {
      revoked_at: new Date(),
    },
  });
}
