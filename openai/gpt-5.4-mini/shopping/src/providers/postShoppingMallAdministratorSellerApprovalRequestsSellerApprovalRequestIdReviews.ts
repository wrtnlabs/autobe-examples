import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { IShoppingMallSellerApprovalRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestReview";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSellerApprovalRequestReviewCollector } from "../collectors/ShoppingMallSellerApprovalRequestReviewCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerApprovalRequestReviewTransformer } from "../transformers/ShoppingMallSellerApprovalRequestReviewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellerApprovalRequestsSellerApprovalRequestIdReviews(props: {
  administrator: AdministratorPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalRequestReview.ICreate;
}): Promise<IShoppingMallSellerApprovalRequestReview> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const sellerApprovalRequest =
      await prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow({
        where: { id: props.sellerApprovalRequestId },
        select: {
          id: true,
          status: true,
          rejection_reason: true,
        },
      });
    if (sellerApprovalRequest.status !== "pending") {
      throw new HttpException("Seller approval request is not reviewable", 409);
    }
    const alreadyReviewed =
      await prisma.shopping_mall_seller_approval_request_reviews.findFirst({
        where: {
          shopping_mall_seller_approval_request_id:
            props.sellerApprovalRequestId,
        },
        select: {
          id: true,
        },
      });
    if (alreadyReviewed !== null) {
      throw new HttpException(
        "Seller approval request has already been reviewed",
        409,
      );
    }
    const created =
      await prisma.shopping_mall_seller_approval_request_reviews.create({
        data: await ShoppingMallSellerApprovalRequestReviewCollector.collect({
          body: props.body,
          sellerApprovalRequest: sellerApprovalRequest,
          administrator: props.administrator,
        }),
        ...ShoppingMallSellerApprovalRequestReviewTransformer.select(),
      });
    await prisma.shopping_mall_seller_approval_requests.update({
      where: { id: props.sellerApprovalRequestId },
      data: {
        status: props.body.decision === "approved" ? "approved" : "rejected",
        rejection_reason:
          props.body.decision === "rejected"
            ? (props.body.rejectionReason ?? null)
            : null,
      },
    });
    return await ShoppingMallSellerApprovalRequestReviewTransformer.transform(
      created,
    );
  });
}
