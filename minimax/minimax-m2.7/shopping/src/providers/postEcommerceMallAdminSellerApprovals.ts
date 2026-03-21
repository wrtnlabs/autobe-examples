import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerApprovalCollector } from "../collectors/EcommerceMallSellerApprovalCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerApprovalTransformer } from "../transformers/EcommerceMallSellerApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSellerApprovals(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerApproval.ICreate;
}): Promise<IEcommerceMallSellerApproval> {
  // 1. Find the seller by ID
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.body.sellerId },
    select: {
      id: true,
      email: true,
      approval_status: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  // 2. Verify seller has 'pending' status
  if (seller.approval_status !== "pending") {
    throw new HttpException(
      "Seller has already been processed. Only pending sellers can be approved or rejected.",
      400,
    );
  }
  // 3. Get admin email and verify not self-approving own seller account
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.admin.id },
    select: { id: true, email: true },
  });
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }
  // Check if this admin has a seller account
  const adminSellerAccount =
    await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
      where: {
        email: admin.email,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Prevent admin from approving their own seller account
  if (adminSellerAccount && adminSellerAccount.id === props.body.sellerId) {
    throw new HttpException("You cannot approve your own seller account.", 403);
  }
  // 4. Use collector to prepare approval data
  const approvalData = await EcommerceMallSellerApprovalCollector.collect({
    body: props.body,
    ecommerceMallAdmins: props.admin,
  });
  // 5. Execute transaction: create approval + update seller status
  const createdApproval = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create the approval record
    const approval = await tx.ecommerce_mall_seller_approvals.create({
      data: approvalData,
    });
    // Update seller approval status
    const updateData: {
      approval_status: string;
      rejection_reason?: string | null;
      rejected_at?: Date | null;
    } = {
      approval_status: props.body.status,
    };
    if (props.body.status === "rejected") {
      updateData.rejection_reason = props.body.rejectionReason ?? null;
      updateData.rejected_at = new Date();
    }
    await tx.ecommerce_mall_sellers.update({
      where: { id: props.body.sellerId },
      data: updateData,
    });
    return approval;
  });
  // 6. Fetch complete approval with relations for response
  const fullApproval =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.findUniqueOrThrow({
      where: { id: createdApproval.id },
      ...EcommerceMallSellerApprovalTransformer.select(),
    });
  // 7. Transform and return
  return await EcommerceMallSellerApprovalTransformer.transform(fullApproval);
}
