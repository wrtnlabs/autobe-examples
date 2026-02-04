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

export async function postShoppingMallAdminSellersSellerIdSuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify seller exists and get current state
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // Check if already suspended
  if (seller.is_suspended === true) {
    throw new HttpException("Seller already suspended", 409);
  }
  // Prepare timestamp for suspension - converted to correct format
  const suspendedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Update seller suspension status - DO NOT include suspended_at as it doesn't exist in schema
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_suspended: true,
    },
  });
  // Create snapshot of seller profile before suspension
  await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      seller_id: seller.id,
      shop_name: seller.shop_name,
      // Removed non-existent description field - schema doesn't have this property
      logo_image_url: seller.logo_image_url, // Corrected: profile_image_url → logo_image_url
      created_at: seller.created_at,
      updated_by_admin_id: props.admin.id,
    },
  });
}
