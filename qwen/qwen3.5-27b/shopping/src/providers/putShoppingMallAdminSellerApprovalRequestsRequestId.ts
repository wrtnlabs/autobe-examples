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
  // Find the approval request (will throw 404 if not found or soft-deleted)
  const request =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
          shopping_mall_seller_id: true,
        },
      },
    );
  // Validate that the request is still pending
  if (request.status !== "pending") {
    throw new HttpException("Approval request is already processed", 400);
  }
  // Validate rejection_reason is provided when rejecting
  if (
    props.body.status === "rejected" &&
    (!props.body.rejection_reason || props.body.rejection_reason.trim() === "")
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a seller application",
      400,
    );
  }
  const now = new Date();
  // Update the approval request and seller in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the approval request
    await tx.shopping_mall_seller_approval_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        responded_at: now,
        updated_at: now,
      },
    });
    // Update the seller's approval status
    const sellerUpdateData: Prisma.shopping_mall_sellersUpdateInput = {
      approval_status: props.body.status,
      updated_at: now,
    };
    // Add rejection_reason if rejecting
    if (props.body.status === "rejected" && props.body.rejection_reason) {
      sellerUpdateData.rejection_reason = props.body.rejection_reason;
    }
    await tx.shopping_mall_sellers.update({
      where: { id: request.shopping_mall_seller_id },
      data: sellerUpdateData,
    });
  });
  // Fetch the updated request with full relations
  const updatedRequest =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallSellerApprovalRequestTransformer.select(),
      },
    );
  // Transform and return
  return await ShoppingMallSellerApprovalRequestTransformer.transform(
    updatedRequest,
  );
}
