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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminSellerRegistrationsRegistrationId(props: {
  admin: AdminPayload;
  registrationId: string & tags.Format<"uuid">;
  body: IEcommerceMallSellerRegistration.IUpdate;
}): Promise<IEcommerceMallSellerRegistration> {
  // Fetch the existing registration with seller relation
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: {
          id: true,
          seller_id: true,
          reviewer_id: true,
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
        },
      },
    );
  // Validate status transition - only 'pending' can be updated
  if (registration.status !== "pending") {
    throw new HttpException(
      `Cannot update registration with status '${registration.status}'. Only 'pending' registrations can be updated.`,
      400,
    );
  }
  // Validate rejection reason is required when rejecting
  if (
    props.body.status === "rejected" &&
    (props.body.rejection_reason === null || props.body.rejection_reason === "")
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a registration",
      400,
    );
  }
  // Update the registration
  const updated =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.update({
      where: { id: props.registrationId },
      data: {
        status: props.body.status,
        rejection_reason: props.body.rejection_reason,
        reviewer_id: props.admin.id,
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        status: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        reviewed_at: true,
        reviewer_id: true,
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
    });
  // Return the updated registration
  return {
    id: updated.id as string & tags.Format<"uuid">,
    seller: {
      id: updated.seller.id as string & tags.Format<"uuid">,
      email: updated.seller.email,
      approvalStatus: updated.seller.approval_status,
      createdAt: updated.seller.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updatedAt: updated.seller.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deletedAt: updated.seller.deleted_at?.toISOString() as
        | (string & tags.Format<"date-time">)
        | null,
    },
    status: updated.status,
    rejectionReason: updated.rejection_reason,
    createdAt: updated.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: updated.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    reviewedAt: updated.reviewed_at?.toISOString() as
      | (string & tags.Format<"date-time">)
      | null,
    reviewer: updated.reviewer
      ? {
          id: updated.reviewer.id as string & tags.Format<"uuid">,
          email: updated.reviewer.email,
          grade: updated.reviewer.grade,
          status: updated.reviewer.status,
          nickname: updated.reviewer.nickname,
          createdAt: updated.reviewer.created_at.toISOString() as string &
            tags.Format<"date-time">,
        }
      : null,
  };
}
