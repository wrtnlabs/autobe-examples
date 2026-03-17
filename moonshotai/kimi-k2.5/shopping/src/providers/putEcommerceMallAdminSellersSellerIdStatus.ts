import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putEcommerceMallAdminSellersSellerIdStatus(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSeller.IUpdateStatus;
}): Promise<IEcommerceMallSeller> {
  // Find seller and verify existence
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      select: {
        id: true,
        approval_status: true,
        created_at: true,
        deleted_at: true,
      },
    },
  );
  // Verify seller is not soft-deleted
  if (seller.deleted_at !== null) {
    throw new HttpException("Cannot modify a deleted seller account", 400);
  }
  // Prevent self-modification
  if (props.admin.id === props.sellerId) {
    throw new HttpException(
      "Administrators cannot modify their own seller account status",
      403,
    );
  }
  // Validate approval status value
  const validStatuses: Array<"approved" | "rejected" | "suspended"> = [
    "approved",
    "rejected",
    "suspended",
  ];
  if (!validStatuses.includes(props.body.approvalStatus)) {
    throw new HttpException(
      "Invalid approval status. Must be one of: approved, rejected, suspended",
      400,
    );
  }
  // If rejecting, ensure rejection reason is provided
  if (
    props.body.approvalStatus === "rejected" &&
    (!props.body.rejectionReason ||
      props.body.rejectionReason.trim().length === 0)
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a seller registration",
      400,
    );
  }
  // Update seller approval status
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: props.body.approvalStatus,
      updated_at: now,
    },
  });
  // Find the most recent seller registration for this seller
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findFirst({
      where: { seller_id: props.sellerId },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
      },
    });
  // Update registration record with status and rejection reason if provided
  if (registration !== null) {
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
      where: { id: registration.id },
      data: {
        status: props.body.approvalStatus,
        updated_at: now,
        reviewed_at: now,
        reviewer: { connect: { id: props.admin.id } },
        ...(props.body.approvalStatus === "rejected" &&
        props.body.rejectionReason !== undefined &&
        props.body.rejectionReason !== null
          ? { rejection_reason: props.body.rejectionReason }
          : {}),
        ...(props.body.approvalStatus === "approved"
          ? { rejection_reason: null }
          : {}),
      },
    });
  }
  // Create audit log entry
  await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      ecommerce_mall_admin_id: props.admin.id,
      action: "update_seller_status",
      resource_type: "seller",
      resource_id: props.sellerId,
      details: JSON.stringify({
        previousStatus: seller.approval_status,
        newStatus: props.body.approvalStatus,
        reason: props.body.rejectionReason ?? null,
      }),
      created_at: now,
    },
  });
  // Get the latest seller profile snapshot for the response
  const latestSnapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findFirst({
      where: {
        seller_id: props.sellerId,
      },
      orderBy: { created_at: "desc" },
      select: {
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
      },
    });
  // Construct response according to IEcommerceMallSeller DTO
  const response: IEcommerceMallSeller = {
    shopName: latestSnapshot?.shop_name ?? null,
    shopDescription: latestSnapshot?.shop_description ?? null,
    logoImageUrl: latestSnapshot?.logo_image_url ?? null,
    createdAt: toISOStringSafe(latestSnapshot?.created_at ?? seller.created_at),
  };
  return response;
}
