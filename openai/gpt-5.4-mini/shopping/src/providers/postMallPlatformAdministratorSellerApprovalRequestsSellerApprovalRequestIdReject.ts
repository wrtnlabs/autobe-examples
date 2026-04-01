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

export async function postMallPlatformAdministratorSellerApprovalRequestsSellerApprovalRequestIdReject(props: {
  administrator: AdministratorPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformSellerApprovalRequest.IReject;
}): Promise<IMallPlatformSellerApprovalRequest> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.rejectionReason === null) {
    throw new HttpException("Rejection reason is required", 400);
  }
  const current =
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
  if (current.status !== "pending") {
    throw new HttpException("Seller approval request is not pending", 400);
  }
  await MyGlobal.prisma.mall_platform_seller_approval_requests.update({
    where: {
      id: props.sellerApprovalRequestId,
    },
    data: {
      status: "rejected",
      rejection_reason: props.body.rejectionReason,
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
