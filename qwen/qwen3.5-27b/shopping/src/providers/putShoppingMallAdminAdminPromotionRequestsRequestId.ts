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
  // Verify requesting admin has 'super' grade
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true, grade: true },
    });
  if (adminRecord.grade !== "super") {
    throw new HttpException(
      "Only super administrators can approve or reject promotion requests",
      403,
    );
  }
  // Fetch the promotion request
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: { id: true, status: true, shopping_mall_admin_id: true },
      },
    );
  // Validate request status is 'pending'
  if (request.status !== "pending") {
    throw new HttpException(
      "Only pending promotion requests can be approved or rejected",
      400,
    );
  }
  // Validate action parameter
  if (props.body.action !== "approve" && props.body.action !== "reject") {
    throw new HttpException("Action must be either 'approve' or 'reject'", 400);
  }
  // If rejecting, validate rejectionReason is provided
  if (
    props.body.action === "reject" &&
    (!props.body.rejectionReason ||
      props.body.rejectionReason.trim().length === 0)
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a promotion request",
      400,
    );
  }
  // Update the promotion request and optionally the admin record
  const now = new Date();
  if (props.body.action === "approve") {
    // Update promotion request and admin grade
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.shopping_mall_admin_promotion_requests.update({
        where: { id: props.requestId },
        data: {
          status: "approved",
          responded_at: now,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.shopping_mall_admins.update({
        where: { id: request.shopping_mall_admin_id },
        data: {
          grade: "regular",
          status: "active",
          updated_at: now,
        },
      }),
    ]);
  } else {
    // Just update the promotion request (reject)
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.update({
      where: { id: props.requestId },
      data: {
        status: "rejected",
        responded_at: now,
        updated_at: now,
      },
    });
  }
  // Fetch and return the updated promotion request
  const updatedRequest =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdminPromotionRequestTransformer.transform(
    updatedRequest,
  );
}
