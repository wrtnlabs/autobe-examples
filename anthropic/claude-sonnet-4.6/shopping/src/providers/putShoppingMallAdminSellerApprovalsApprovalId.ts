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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminAtSummaryTransformer } from "../transformers/ShoppingMallAdminAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "../transformers/ShoppingMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminSellerApprovalsApprovalId(props: {
  admin: AdminPayload;
  approvalId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApproval.IUpdate;
}): Promise<IShoppingMallSellerApproval> {
  const prismaAny = MyGlobal.prisma as any;
  // Step 1: Find the approval record — 404 if not found
  const existing = await prismaAny.shoppingMallSellerApproval.findUniqueOrThrow(
    {
      where: { id: props.approvalId },
      select: { id: true, status: true },
    },
  );
  // Step 2: Validate current status is 'pending'
  if (existing.status !== "pending") {
    throw new HttpException(
      "This seller approval has already been decided and cannot be reviewed again.",
      422,
    );
  }
  // Step 3: Validate rejection_reason for 'rejected' status
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "A rejection reason must be provided when rejecting a seller approval.",
      422,
    );
  }
  const now = new Date();
  // Step 4: Update the approval record
  await prismaAny.shoppingMallSellerApproval.update({
    where: { id: props.approvalId },
    data: {
      status: props.body.status,
      rejection_reason:
        props.body.status === "approved" ? null : props.body.rejection_reason,
      reviewed_at: now,
      reviewed_by_admin_id: props.admin.id,
      updated_at: now,
    },
  });
  // Step 5: Fetch the updated record with all relations for response
  const updated = await prismaAny.shoppingMallSellerApproval.findUniqueOrThrow({
    where: { id: props.approvalId },
    select: {
      id: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      seller: ShoppingMallSellerAtSummaryTransformer.select(),
      reviewedBy: ShoppingMallAdminAtSummaryTransformer.select(),
    },
  });
  const statusValue =
    updated.status === "approved"
      ? "approved"
      : updated.status === "rejected"
        ? "rejected"
        : "pending";
  const reviewedByRecord = updated.reviewedBy
    ? await ShoppingMallAdminAtSummaryTransformer.transform(updated.reviewedBy)
    : null;
  return {
    id: updated.id,
    seller: await ShoppingMallSellerAtSummaryTransformer.transform(
      updated.seller,
    ),
    status: statusValue,
    submitted_at: toISOStringSafe(updated.submitted_at),
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : null,
    rejection_reason: updated.rejection_reason ?? null,
    reviewed_by: reviewedByRecord,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  } satisfies IShoppingMallSellerApproval;
}
