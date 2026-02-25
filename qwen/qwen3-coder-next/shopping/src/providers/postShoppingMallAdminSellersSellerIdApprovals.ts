import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function postShoppingMallAdminSellersSellerIdApprovals(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfile.IApproval;
}): Promise<void> {
  // Validate seller exists and is pending approval
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: {
      id: true,
      approval_status: true,
      shop_name: true,
      shopping_mall_user_id: true,
      created_at: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.approval_status !== "pending_admin_approval") {
    throw new HttpException(
      `Seller approval status is '${seller.approval_status}', cannot approve/reject`,
      400,
    );
  }
  // Validate action and rejection_reason
  if (props.body.action === "reject" && !props.body.rejection_reason) {
    throw new HttpException("Rejection reason is required when rejecting", 400);
  }
  if (
    props.body.rejection_reason &&
    (props.body.rejection_reason.length < 1 ||
      props.body.rejection_reason.length > 1000)
  ) {
    throw new HttpException(
      "Rejection reason must be between 1 and 1000 characters",
      400,
    );
  }
  const now = new Date();
  const nowStr = now.toISOString() as string & tags.Format<"date-time">;
  // Create approval record and update seller status
  await MyGlobal.prisma.shopping_mall_seller_approvals.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_seller_id: props.sellerId,
      status: props.body.action,
      rejection_reason: props.body.rejection_reason || null,
      processed_at: nowStr,
      created_at: nowStr,
      updated_at: nowStr,
    },
  });
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: props.body.action === "approve" ? "active" : "rejected",
      rejection_reason:
        props.body.action === "reject" ? props.body.rejection_reason : null,
      approval_date: props.body.action === "approve" ? nowStr : null,
      updated_at: nowStr,
    },
  });
}
