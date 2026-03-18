import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { ShoppingMallSellerApprovalRequestTransformer } from "../transformers/ShoppingMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSellerApprovalRequestsSellerApprovalRequestIdReviews(props: {
  administrator: AdministratorPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerApprovalRequestReview.ICreate;
}): Promise<IShoppingMallSellerApprovalRequest> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findFirstOrThrow({
      where: {
        id: props.administrator.id,
        deleted_at: null,
      },
      select: {
        id: true,
        grade: true,
        deleted_at: true,
      },
    });
  if (administrator.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const sellerApprovalRequest =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.sellerApprovalRequestId },
        select: {
          id: true,
          status: true,
          rejection_reason: true,
          deleted_at: true,
        },
      },
    );
  if (sellerApprovalRequest.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (sellerApprovalRequest.status !== "pending") {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.decision !== "approved" &&
    props.body.decision !== "rejected"
  ) {
    throw new HttpException("Bad Request", 400);
  }
  if (
    props.body.decision === "rejected" &&
    props.body.rejectionReason == null
  ) {
    throw new HttpException("Bad Request", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_seller_approval_request_reviews.create({
      data: await ShoppingMallSellerApprovalRequestReviewCollector.collect({
        body: props.body,
        sellerApprovalRequest: sellerApprovalRequest,
        administrator: administrator,
      }),
    });
    await tx.shopping_mall_seller_approval_requests.update({
      where: { id: props.sellerApprovalRequestId },
      data: {
        status: props.body.decision,
        rejection_reason:
          props.body.decision === "rejected"
            ? props.body.rejectionReason
            : null,
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.sellerApprovalRequestId },
        ...ShoppingMallSellerApprovalRequestTransformer.select(),
      },
    );
  return await ShoppingMallSellerApprovalRequestTransformer.transform(updated);
}
