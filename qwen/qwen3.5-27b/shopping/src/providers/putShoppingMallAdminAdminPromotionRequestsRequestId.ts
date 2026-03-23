import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminPromotionRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPromotionRequest.IApproveOrReject;
}): Promise<IShoppingMallAdminPromotionRequest> {
  // Verify the requesting admin has 'super' grade level
  const requestingAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        grade: true,
      },
    });
  if (requestingAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can approve or reject promotion requests",
      403,
    );
  }
  // Fetch the promotion request
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_admin_id: true,
          status: true,
        },
      },
    );
  // Validate that the request status is 'pending'
  if (request.status !== "pending") {
    throw new HttpException(
      "Only pending promotion requests can be approved or rejected",
      400,
    );
  }
  // Validate the action parameter
  if (props.body.action !== "approve" && props.body.action !== "reject") {
    throw new HttpException("Action must be either 'approve' or 'reject'", 400);
  }
  // If action is 'reject', validate that rejectionReason is provided
  if (
    props.body.action === "reject" &&
    (!props.body.rejectionReason || props.body.rejectionReason.trim() === "")
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a promotion request",
      400,
    );
  }
  // Begin database transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the promotion request
    await tx.shopping_mall_admin_promotion_requests.update({
      where: {
        id: props.requestId,
      },
      data: {
        status: props.body.action === "approve" ? "approved" : "rejected",
        responded_at: now,
        updated_at: now,
      },
    });
    // If action is 'approve', update the admin's grade to 'regular' and status to 'active'
    if (props.body.action === "approve") {
      await tx.shopping_mall_admins.update({
        where: {
          id: request.shopping_mall_admin_id,
        },
        data: {
          grade: "regular",
          status: "active",
        },
      });
    }
  });
  // Fetch the updated request with full details for response
  const finalRequest =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
        },
        ...ShoppingMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdminPromotionRequestTransformer.transform(
    finalRequest,
  );
}
