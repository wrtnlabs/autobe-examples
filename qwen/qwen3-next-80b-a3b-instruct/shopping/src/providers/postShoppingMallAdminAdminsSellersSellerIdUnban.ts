import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminAdminsSellersSellerIdUnban(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify seller exists and get current status
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  // Handle seller not found
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // Check if seller is suspended - must be true for unsuspend to proceed
  if (!seller.is_suspended) {
    throw new HttpException("Seller is not currently suspended", 400);
  }
  // Update seller to unsuspended state
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: { is_suspended: false },
  });
  // Return success (void)
  return;
}
