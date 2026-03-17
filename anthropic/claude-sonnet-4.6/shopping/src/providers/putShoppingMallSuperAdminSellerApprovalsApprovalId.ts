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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdminSellerApprovalsApprovalId(props: {
  superAdmin: SuperadminPayload;
  approvalId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApproval.IUpdate;
}): Promise<IShoppingMallSellerApproval> {
  // Step 1: Look up the existing approval record (auto-throws 404 if not found)
  const existing = await (
    MyGlobal.prisma as any
  ).shopping_mall_seller_approvals.findUniqueOrThrow({
    where: { id: props.approvalId },
    select: { id: true, status: true },
  });
  // Step 2: Validate that the approval is still pending (business rule: cannot re-decide)
  if (existing.status !== "pending") {
    throw new HttpException(
      "This seller approval has already been decided and cannot be updated again.",
      422,
    );
  }
  // Step 3: If rejecting, ensure rejection_reason is provided
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "A rejection reason must be provided when rejecting a seller registration.",
      422,
    );
  }
  const now = new Date();
  // Step 4: Update the approval record
  await (MyGlobal.prisma as any).shopping_mall_seller_approvals.update({
    where: { id: props.approvalId },
    data: {
      status: props.body.status,
      rejection_reason:
        props.body.status === "approved" ? null : props.body.rejection_reason,
      reviewed_at: now,
      reviewed_by_admin_id: props.superAdmin.id,
      updated_at: now,
    },
  });
  // Step 5: Retrieve the updated record with seller relation
  const updated = await (
    MyGlobal.prisma as any
  ).shopping_mall_seller_approvals.findUniqueOrThrow({
    where: { id: props.approvalId },
    select: {
      id: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      reviewed_by_admin_id: true,
      created_at: true,
      updated_at: true,
      seller: ShoppingMallSellerAtSummaryTransformer.select(),
    },
  });
  // Step 6: Get reviewer (super admin) details
  const reviewer =
    await MyGlobal.prisma.shopping_mall_super_admins.findUniqueOrThrow({
      where: { id: props.superAdmin.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Step 7: Determine the super admin's actor_type from the subtype linkage tables
  const fromCustomer = await (
    MyGlobal.prisma as any
  ).shopping_mall_super_admin_of_customers.findFirst({
    where: { shopping_mall_super_admin_id: props.superAdmin.id },
    select: { shopping_mall_super_admin_id: true },
  });
  const reviewerActorType: "customer" | "seller" =
    fromCustomer !== null ? "customer" : "seller";
  // Step 8: Build and return the full response DTO
  const reviewerSummary: IShoppingMallAdmin.ISummary = {
    id: reviewer.id,
    email: reviewer.email,
    actor_type: reviewerActorType,
    grade: "super",
    created_at: toISOStringSafe(reviewer.created_at),
    updated_at: toISOStringSafe(reviewer.updated_at),
    deleted_at:
      reviewer.deleted_at !== null
        ? toISOStringSafe(reviewer.deleted_at)
        : null,
  };
  const approvalStatus = updated.status satisfies
    | "pending"
    | "approved"
    | "rejected";
  return {
    id: updated.id,
    seller: await ShoppingMallSellerAtSummaryTransformer.transform(
      updated.seller,
    ),
    status: approvalStatus,
    submitted_at: toISOStringSafe(updated.submitted_at),
    reviewed_at: toISOStringSafe(updated.reviewed_at),
    rejection_reason: updated.rejection_reason,
    reviewed_by: reviewerSummary,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  } satisfies IShoppingMallSellerApproval;
}
