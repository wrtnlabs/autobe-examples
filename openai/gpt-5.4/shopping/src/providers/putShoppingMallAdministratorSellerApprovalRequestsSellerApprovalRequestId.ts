import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalRequestTransformer } from "../transformers/ShoppingMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorSellerApprovalRequestsSellerApprovalRequestId(props: {
  administrator: AdministratorPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalRequest.IUpdate;
}): Promise<IShoppingMallSellerApprovalRequest> {
  if (props.body.status === undefined)
    throw new HttpException("Review decision status is required", 400);
  if (props.body.status !== "approved" && props.body.status !== "rejected")
    throw new HttpException("Invalid review decision", 400);
  if (
    props.body.status === "rejected" &&
    (props.body.reason === undefined || props.body.reason === null)
  )
    throw new HttpException("Rejection reason is required", 400);
  const request =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.sellerApprovalRequestId,
        },
        select: {
          id: true,
          status: true,
          shopping_mall_seller_id: true,
        },
      },
    );
  if (request.status !== "pending")
    throw new HttpException(
      "Seller approval request is no longer pending",
      400,
    );
  const reviewedAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(new globalThis.Date().toISOString());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_seller_approval_requests.update({
      where: {
        id: props.sellerApprovalRequestId,
      },
      data: {
        status: props.body.status,
        reason:
          props.body.status === "rejected" ? (props.body.reason ?? null) : null,
        shopping_mall_administrator_id: props.administrator.id,
        reviewed_at: reviewedAt,
        updated_at: reviewedAt,
      },
    });
    await tx.shopping_mall_sellers.update({
      where: {
        id: request.shopping_mall_seller_id,
      },
      data: {
        approval_status: props.body.status,
        rejection_reason:
          props.body.status === "rejected" ? (props.body.reason ?? null) : null,
        updated_at: reviewedAt,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.sellerApprovalRequestId,
        },
        ...ShoppingMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await ShoppingMallSellerApprovalRequestTransformer.transform(updated);
}
