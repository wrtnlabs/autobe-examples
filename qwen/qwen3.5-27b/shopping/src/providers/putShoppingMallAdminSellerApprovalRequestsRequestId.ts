import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerApprovalRequestTransformer } from "../transformers/ShoppingMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminSellerApprovalRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalRequest.IUpdate;
}): Promise<IShoppingMallSellerApprovalRequest> {
  // Find the approval request
  const request =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          deleted_at: true,
          shopping_mall_seller_id: true,
        },
      },
    );
  // Check if soft-deleted
  if (request.deleted_at !== null) {
    throw new HttpException("Approval request not found", 404);
  }
  // Check if status is pending
  if (request.status !== "pending") {
    throw new HttpException("Cannot update non-pending approval request", 400);
  }
  // Validate rejection_reason when rejecting
  if (
    props.body.status === "rejected" &&
    (!props.body.rejection_reason || props.body.rejection_reason.trim() === "")
  ) {
    throw new HttpException("Rejection reason is required when rejecting", 400);
  }
  const now = new Date();
  // Update the approval request
  await MyGlobal.prisma.shopping_mall_seller_approval_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      responded_at: now,
      updated_at: now,
    },
  });
  // Update the related seller record
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: request.shopping_mall_seller_id },
    data: {
      approval_status: props.body.status,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejection_reason : null,
      updated_at: now,
    },
  });
  // Fetch the updated approval request with seller relation
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await ShoppingMallSellerApprovalRequestTransformer.transform(updated);
}
