import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminAdminPromotionRequestsPromotionRequestId(props: {
  superAdmin: SuperadminPayload;
  promotionRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminPromotionRequest.IUpdate;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  // Validate body status
  const status = props.body.status;
  if (status !== "approved" && status !== "rejected") {
    throw new HttpException(
      "Invalid status. Must be 'approved' or 'rejected'.",
      400,
    );
  }
  // Validate rejection has reason
  if (
    status === "rejected" &&
    (!props.body.rejectionReason || props.body.rejectionReason.length === 0)
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a request.",
      400,
    );
  }
  // Fetch promotion request with all relations needed
  const promotionRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.promotionRequestId },
        select: {
          id: true,
          status: true,
          reason: true,
          rejection_reason: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          reviewer_id: true,
          customerSubtype: {
            select: {
              customer: {
                select: {
                  id: true,
                  email: true,
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
                  approval_status: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindUniqueArgs["select"],
      },
    );
  // Validate status is pending
  if (promotionRequest.status !== "pending") {
    throw new HttpException(
      "Only pending promotion requests can be updated.",
      400,
    );
  }
  const now = new Date();
  const previousStatus = promotionRequest.status;
  const previousReviewerId = promotionRequest.reviewer_id;
  // Determine requester email from original query
  let requesterEmail: string | undefined;
  if (promotionRequest.customerSubtype) {
    requesterEmail = promotionRequest.customerSubtype.customer.email;
  } else if (promotionRequest.sellerRequest) {
    requesterEmail = promotionRequest.sellerRequest.seller.email;
  }
  if (!requesterEmail) {
    throw new HttpException(
      "Invalid promotion request: no requester found.",
      400,
    );
  }
  // Execute transaction
  const updatedRequest = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update promotion request
    const updated = await tx.ecommerce_mall_admin_promotion_requests.update({
      where: { id: props.promotionRequestId },
      data: {
        status: status,
        reviewer_id: props.superAdmin.id,
        rejection_reason:
          status === "approved" ? null : props.body.rejectionReason,
        updated_at: now,
      },
      select: {
        id: true,
        status: true,
        reason: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer_id: true,
        customerSubtype: {
          select: {
            customer: EcommerceMallCustomerAtSummaryTransformer.select(),
          } satisfies Prisma.ecommerce_mall_admin_promotion_request_customersFindManyArgs["select"],
        },
        sellerRequest: {
          select: {
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              } satisfies Prisma.ecommerce_mall_sellersFindManyArgs["select"],
            },
          } satisfies Prisma.ecommerce_mall_admin_promotion_request_sellersFindManyArgs["select"],
        },
        reviewer: EcommerceMallAdminAtSummaryTransformer.select(),
      } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindUniqueArgs["select"],
    });
    // Create snapshot for audit trail
    await tx.ecommerce_mall_admin_promotion_request_snapshots.create({
      data: {
        id: v4(),
        admin_promotion_request_id: props.promotionRequestId,
        previous_reviewer_id: previousReviewerId,
        new_reviewer_id: props.superAdmin.id,
        previous_status: previousStatus,
        new_status: status,
        previous_reason: promotionRequest.rejection_reason,
        new_reason: status === "approved" ? null : props.body.rejectionReason,
        created_at: now,
      },
    });
    // If approved, create admin record for requester
    if (status === "approved") {
      await tx.ecommerce_mall_admins.create({
        data: {
          id: v4(),
          email: requesterEmail,
          password_hash: "PLACEHOLDER",
          grade: "regular",
          status: "active",
          nickname: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    return updated;
  });
  // Transform to response DTO using the transformer
  return await EcommerceMallAdminPromotionRequestTransformer.transform(
    updatedRequest as EcommerceMallAdminPromotionRequestTransformer.Payload,
  );
}
