import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSellersRegistrationsRegistrationIdReview(props: {
  admin: AdminPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistration.IReview;
}): Promise<IEcommerceMallSellerRegistration> {
  // Validate registration exists and is pending
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: {
          id: true,
          seller_id: true,
          status: true,
        },
      },
    );
  if (registration.status !== "pending") {
    throw new HttpException("Registration is not in pending status", 400);
  }
  // Validate rejection_reason is provided when rejecting
  if (
    props.body.status === "rejected" &&
    props.body.rejection_reason === null
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a registration",
      400,
    );
  }
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Create snapshot for audit trail
    await prisma.ecommerce_mall_seller_registration_snapshots.create({
      data: {
        id: v4(),
        registration: { connect: { id: props.registrationId } },
        reviewer: { connect: { id: props.admin.id } },
        created_at: now,
      },
    });
    // Update registration with review decision
    await prisma.ecommerce_mall_seller_registrations.update({
      where: { id: props.registrationId },
      data: {
        status: props.body.status,
        reviewer: { connect: { id: props.admin.id } },
        rejection_reason: props.body.rejection_reason,
        reviewed_at: now,
        updated_at: now,
      },
    });
    // If approved, update seller approval_status
    if (props.body.status === "approved") {
      await prisma.ecommerce_mall_sellers.update({
        where: { id: registration.seller_id },
        data: {
          approval_status: "approved",
          updated_at: now,
        },
      });
    }
  });
  // Fetch updated registration with all relations
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: {
          id: true,
          status: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          reviewed_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        },
      },
    );
  return {
    id: updated.id,
    status: updated.status,
    rejectionReason: updated.rejection_reason,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
    reviewedAt: updated.reviewed_at?.toISOString() ?? null,
    seller: {
      id: updated.seller.id,
      email: updated.seller.email,
      approvalStatus: updated.seller.approval_status,
      createdAt: updated.seller.created_at.toISOString(),
      updatedAt: updated.seller.updated_at.toISOString(),
      deletedAt: updated.seller.deleted_at?.toISOString() ?? null,
    },
    reviewer: updated.reviewer
      ? await EcommerceMallAdminAtSummaryTransformer.transform(updated.reviewer)
      : null,
  };
}
