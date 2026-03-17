import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerApprovals(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerApproval.ICreate;
}): Promise<IShoppingMallSellerApproval> {
  // Step 1: Verify seller exists and check ban status
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: {
      id: true,
      email: true,
      shop_name: true,
      is_banned: true,
      is_suspended: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (seller.is_banned) {
    throw new HttpException(
      "Seller account is banned and cannot submit approval requests",
      403,
    );
  }
  // Step 2: Find the most recent seller approval record
  const mostRecentApproval = await (
    MyGlobal.prisma as any
  ).shopping_mall_seller_approvals.findFirst({
    where: { seller_id: props.seller.id },
    orderBy: { created_at: "desc" },
    select: { id: true, status: true },
  });
  // Step 3: Validate resubmission eligibility
  if (mostRecentApproval !== null) {
    if (mostRecentApproval.status === "pending") {
      throw new HttpException(
        "A pending approval request already exists. Please wait for an administrator decision before resubmitting.",
        422,
      );
    }
    if (mostRecentApproval.status === "approved") {
      throw new HttpException(
        "Your seller account is already approved. A new approval request cannot be submitted.",
        422,
      );
    }
  }
  // Step 4: Create new pending approval record atomically
  const now = new Date();
  const newId = typia.assert<string & tags.Format<"uuid">>(v4());
  const created = await (
    MyGlobal.prisma as any
  ).shopping_mall_seller_approvals.create({
    data: {
      id: newId,
      seller_id: props.seller.id,
      status: "pending",
      submitted_at: now,
      reviewed_at: null,
      rejection_reason: null,
      reviewed_by_admin_id: null,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Step 5: Build and return the IShoppingMallSellerApproval response
  return {
    id: created.id,
    seller: {
      id: seller.id,
      email: seller.email,
      shopName: seller.shop_name,
      isBanned: seller.is_banned,
      isSuspended: seller.is_suspended,
      createdAt: toISOStringSafe(seller.created_at),
      updatedAt: toISOStringSafe(seller.updated_at),
    } satisfies IShoppingMallSeller.ISummary,
    status: "pending",
    submitted_at: toISOStringSafe(created.submitted_at),
    reviewed_at: null,
    rejection_reason: null,
    reviewed_by: null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  } satisfies IShoppingMallSellerApproval;
}
