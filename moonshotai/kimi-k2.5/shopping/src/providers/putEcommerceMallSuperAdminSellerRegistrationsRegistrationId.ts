import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminSellerRegistrationsRegistrationId(props: {
  superAdmin: SuperadminPayload;
  registrationId: string;
  body: IEcommerceMallSellerRegistration.IUpdate;
}): Promise<IEcommerceMallSellerRegistration> {
  // Validate rejection_reason required when rejecting
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "Rejection reason is required when rejecting a registration",
      400,
    );
  }
  // Fetch the registration with seller relation
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUnique({
      where: { id: props.registrationId },
      select: {
        id: true,
        status: true,
        seller_id: true,
      },
    });
  if (!registration) {
    throw new HttpException("Registration not found", 404);
  }
  // Only pending registrations can be updated
  if (registration.status !== "pending") {
    throw new HttpException("Only pending registrations can be processed", 400);
  }
  // Update registration status
  await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
    where: { id: props.registrationId },
    data: {
      status: props.body.status,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejection_reason : null,
      reviewer_id: props.superAdmin.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Update seller approval_status to match
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: registration.seller_id },
    data: {
      approval_status: props.body.status,
      updated_at: new Date(),
    },
  });
  // Fetch complete registration with relations for return
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
          reviewer: {
            select: {
              id: true,
              email: true,
              grade: true,
              status: true,
              nickname: true,
              created_at: true,
            },
          },
        },
      },
    );
  return {
    id: updated.id,
    status: updated.status,
    rejectionReason: updated.rejection_reason ?? null,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    reviewedAt: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : null,
    seller: {
      id: updated.seller.id,
      email: updated.seller.email,
      approvalStatus: updated.seller.approval_status,
      createdAt: toISOStringSafe(updated.seller.created_at),
      updatedAt: toISOStringSafe(updated.seller.updated_at),
      deletedAt: updated.seller.deleted_at
        ? toISOStringSafe(updated.seller.deleted_at)
        : null,
    },
    reviewer: updated.reviewer
      ? {
          id: updated.reviewer.id,
          email: updated.reviewer.email,
          grade: updated.reviewer.grade,
          status: updated.reviewer.status,
          nickname: updated.reviewer.nickname,
          createdAt: toISOStringSafe(updated.reviewer.created_at),
        }
      : null,
  };
}
