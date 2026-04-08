import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminAdminPromotionRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string;
  body: IEcommerceMallAdminPromotionRequest.IUpdate;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  // Find the promotion request with polymorphic subtypes
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          customerSubtype: {
            select: {
              customer: {
                select: {
                  id: true,
                  email: true,
                  password_hash: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          sellerRequest: {
            select: {
              seller: {
                select: {
                  id: true,
                  email: true,
                  password_hash: true,
                  approval_status: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  profileSnapshots: {
                    orderBy: { created_at: "desc" as const },
                    take: 1,
                    select: {
                      id: true,
                      shop_name: true,
                      shop_description: true,
                      logo_image_url: true,
                      created_at: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  // Verify request has pending status
  if (request.status !== "pending") {
    throw new HttpException("Promotion request has already been reviewed", 400);
  }
  // Validate body based on status
  if (props.body.status === "approved") {
    if (
      props.body.rejectionReason !== undefined &&
      props.body.rejectionReason !== null
    ) {
      throw new HttpException(
        "Cannot provide rejection reason when approving",
        400,
      );
    }
  } else if (props.body.status === "rejected") {
    if (
      !props.body.rejectionReason ||
      props.body.rejectionReason.trim().length === 0
    ) {
      throw new HttpException(
        "Rejection reason is required when rejecting",
        400,
      );
    }
  }
  const newStatus = props.body.status ?? "pending";
  const rejectionReason = props.body.rejectionReason ?? null;
  // Update the promotion request
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.update({
      where: { id: props.requestId },
      data: {
        status: newStatus,
        reviewer_id: props.superAdmin.id,
        rejection_reason: rejectionReason,
        updated_at: new Date(),
      },
      ...EcommerceMallAdminPromotionRequestTransformer.select(),
    });
  // If approved, create administrator record for the requester
  if (newStatus === "approved") {
    const requesterEmail =
      request.customerSubtype?.customer?.email ??
      request.sellerRequest?.seller?.email;
    const requesterPassword =
      request.customerSubtype?.customer?.password_hash ??
      request.sellerRequest?.seller?.password_hash;
    if (requesterEmail && requesterPassword) {
      await MyGlobal.prisma.ecommerce_mall_admins.create({
        data: {
          id: v4(),
          email: requesterEmail,
          password_hash: requesterPassword,
          grade: "regular",
          status: "active",
          nickname: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  }
  // Create snapshot for audit trail with required previous/new status fields
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.create(
    {
      data: {
        id: v4(),
        admin_promotion_request_id: props.requestId,
        previous_status: request.status,
        new_status: newStatus,
        previous_reviewer_id: null,
        new_reviewer_id: props.superAdmin.id,
        previous_reason: request.rejection_reason,
        new_reason: rejectionReason,
        created_at: new Date(),
      },
    },
  );
  return await EcommerceMallAdminPromotionRequestTransformer.transform(
    updatedRequest,
  );
}
