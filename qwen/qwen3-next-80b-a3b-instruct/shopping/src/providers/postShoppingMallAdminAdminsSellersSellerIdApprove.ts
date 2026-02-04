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
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";

export async function postShoppingMallAdminAdminsSellersSellerIdApprove(props: {
  admin: AdminPayload;
  sellerId: string;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  // Validate seller exists and is pending approval
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.is_approved === true || seller.is_approved === null) {
    throw new HttpException("Seller is not in pending approval status", 400);
  }
  // Generate timestamp without using Date constructor
  const now = toISOStringSafe(new Date());
  // Transaction to update seller and create snapshot
  const updatedSeller = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update seller approval status
    const updated = await prisma.shopping_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        is_approved: true,
        updated_at: now,
      },
    });
    // Use correct field admin_id from schema instead of admin_session_id
    await prisma.shopping_mall_seller_profile_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        seller_id: props.sellerId,
        admin_id: props.admin.id, // ✅ Correct field name from schema
        created_at: now,
        action: "approve",
        reason: "System approval",
        status: "approved",
        metadata: null,
      },
    });
    return updated;
  });
  // Verify and transform response
  const result = ShoppingMallSellerTransformer.transform(updatedSeller);
  return result;
}
