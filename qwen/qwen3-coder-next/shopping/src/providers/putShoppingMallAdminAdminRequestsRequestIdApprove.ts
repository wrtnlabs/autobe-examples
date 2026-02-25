import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerApprovalAtApprovalResponseTransformer } from "../transformers/ShoppingMallSellerApprovalAtApprovalResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminRequestsRequestIdApprove(props: {
  admin: AdminPayload;
  requestId: string;
  body: IShoppingMallSellerApproval.IApprovalRequest;
}): Promise<IShoppingMallSellerApproval.IApprovalResponse> {
  // Fetch the pending seller approval request
  const approval =
    await MyGlobal.prisma.shopping_mall_seller_approvals.findFirst({
      where: {
        id: props.requestId,
        status: "pending",
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        status: true,
        rejection_reason: true,
        processed_at: true,
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
            approval_date: true,
          },
        },
      },
    });
  // If no pending approval found, throw 404
  if (approval === null) {
    throw new HttpException("Not Found", 404);
  }
  // Convert string to branded type for ID
  const requestId = props.requestId as string & tags.Format<"uuid">;
  // Update the approval record with approved status
  const updatedApproval =
    await MyGlobal.prisma.shopping_mall_seller_approvals.update({
      where: { id: requestId },
      data: {
        status: props.body.approval_action,
        rejection_reason: props.body.rejection_reason ?? null,
        processed_at: new Date(),
      },
    });
  // Update the seller account status to approved if applicable
  if (props.body.approval_action === "approved") {
    await MyGlobal.prisma.shopping_mall_sellers.update({
      where: {
        id: approval.shopping_mall_seller_id as string & tags.Format<"uuid">,
      },
      data: {
        approval_status: "approved",
        approval_date: new Date(),
      },
    });
  }
  // Build response using transformer
  const payload: any = {
    id: updatedApproval.id,
    status: updatedApproval.status,
    shopping_mall_seller_id: updatedApproval.shopping_mall_seller_id,
    rejection_reason: updatedApproval.rejection_reason,
    processed_at:
      updatedApproval.processed_at !== null
        ? toISOStringSafe(updatedApproval.processed_at)
        : null,
    seller: approval.seller
      ? {
          id: approval.seller.id,
          shop_name: approval.seller.shop_name,
          approval_status: approval.seller.approval_status,
          approval_date:
            approval.seller.approval_date !== null
              ? toISOStringSafe(approval.seller.approval_date)
              : null,
        }
      : null,
  };
  return await ShoppingMallSellerApprovalAtApprovalResponseTransformer.transform(
    payload,
  );
}
