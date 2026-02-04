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

export async function postShoppingMallAdminAdminsSellersSellerIdBan(props: {
  admin: AdminPayload;
  sellerId: string;
}): Promise<void> {
  // Find seller to ban
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  // If seller doesn't exist or is already suspended, return 204 (idempotent)
  if (!seller || seller.is_suspended) {
    return;
  }
  // Delete all active sessions for this seller using relation name, not foreign key column
  await MyGlobal.prisma.shopping_mall_seller_sessions.deleteMany({
    where: { seller: { id: props.sellerId } },
  });
  // Update seller to suspended status
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: { is_suspended: true },
  });
}
