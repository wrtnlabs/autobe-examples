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
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminSellersSellerIdApprove(props: {
  admin: AdminPayload;
  sellerId: string;
}): Promise<IShoppingMallSeller.ISummary> {
  // Verify seller exists and is pending approval
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId, is_approved: false, deleted_at: null },
  });
  if (!seller) {
    throw new HttpException("Seller not found or not pending approval", 404);
  }
  // Create immutable snapshot of seller profile
  await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
    data: {
      id: v4(),
      seller_id: seller.id,
      shop_name: seller.shop_name,
      shop_description:
        seller.shop_description !== null ? seller.shop_description : "",
      logo_image_url:
        seller.logo_image_url !== null ? seller.logo_image_url : "",
      admin_id: props.admin.id,
      occurred_at: toISOStringSafe(new Date()),
    },
  });
  // Update seller status to approved
  const approvedSeller = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_approved: true,
      deleted_at: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return exactly ISummary: { sellerId: string & tags.Format<'uuid'> }
  return {
    sellerId: approvedSeller.id,
  };
}
