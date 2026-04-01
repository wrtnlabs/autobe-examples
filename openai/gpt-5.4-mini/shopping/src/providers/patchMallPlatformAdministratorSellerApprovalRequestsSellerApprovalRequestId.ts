import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformSellerApprovalRequestTransformer } from "../transformers/MallPlatformSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSellerApprovalRequestsSellerApprovalRequestId(props: {
  administrator: AdministratorPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformSellerApprovalRequest.IUpdate;
}): Promise<IMallPlatformSellerApprovalRequest> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const sellerApprovalRequest =
    await MyGlobal.prisma.mall_platform_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.sellerApprovalRequestId,
        },
        select: {
          id: true,
          status: true,
        },
      },
    );
  if (sellerApprovalRequest.status !== "pending") {
    throw new HttpException("Seller approval request is not pending", 409);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid seller approval request status", 400);
  }
  if (
    props.body.status === "rejected" &&
    props.body.rejectionReason === undefined
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a seller approval request",
      400,
    );
  }
  if (props.body.status === "rejected" && props.body.rejectionReason === null) {
    throw new HttpException(
      "Rejection reason is required when rejecting a seller approval request",
      400,
    );
  }
  await MyGlobal.prisma.mall_platform_seller_approval_requests.update({
    where: {
      id: props.sellerApprovalRequestId,
    },
    data: {
      status: props.body.status,
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejectionReason : null,
      reviewed_at: new Date(),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.sellerApprovalRequestId,
        },
        ...MallPlatformSellerApprovalRequestTransformer.select(),
      },
    );
  return await MallPlatformSellerApprovalRequestTransformer.transform(updated);
}
