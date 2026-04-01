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

export async function postMallPlatformAdministratorSellerApprovalRequestsSellerApprovalRequestIdApprove(props: {
  administrator: AdministratorPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerApprovalRequest> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const current =
      await prisma.mall_platform_seller_approval_requests.findUniqueOrThrow({
        where: { id: props.sellerApprovalRequestId },
        ...MallPlatformSellerApprovalRequestTransformer.select(),
      });
    if (current.status !== "pending") {
      throw new HttpException("Seller approval request already finalized", 409);
    }
    await prisma.mall_platform_seller_approval_requests.update({
      where: { id: props.sellerApprovalRequestId },
      data: {
        status: "approved",
        reviewed_at: new Date(),
        updated_at: new Date(),
      },
    });
    return await prisma.mall_platform_seller_approval_requests.findUniqueOrThrow(
      {
        where: { id: props.sellerApprovalRequestId },
        ...MallPlatformSellerApprovalRequestTransformer.select(),
      },
    );
  });
  return await MallPlatformSellerApprovalRequestTransformer.transform(updated);
}
