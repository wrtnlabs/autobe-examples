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
import { IShoppingMallSellerRejectionReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerRejectionReason";
import { AdminPayload } from "../decorators/payload/AdminPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postShoppingMallAdminSellersSellerIdReject(props: {
  admin: AdminPayload;
  sellerId: string;
  body: IShoppingMallSellerRejectionReason;
}): Promise<void> {
  // Verify seller exists and is in pending_approval status
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.is_approved !== true) {
    throw new HttpException(
      "Seller status must be pending_approval to be rejected",
      400,
    );
  }
  // Create rejection snapshot with current state
  await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      seller_id: seller.id,
      shop_name: seller.shop_name,
      rejected_by_id: props.admin.id,
      rejected_at: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Update seller status to rejected with rejection reason
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_approved: false,
      approval_rejection_reason: props.body.reason,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
