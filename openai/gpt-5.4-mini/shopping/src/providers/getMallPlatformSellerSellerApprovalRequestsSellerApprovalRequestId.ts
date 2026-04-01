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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformSellerApprovalRequestTransformer } from "../transformers/MallPlatformSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformSellerSellerApprovalRequestsSellerApprovalRequestId(props: {
  seller: SellerPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerApprovalRequest> {
  const approvalRequest =
    await MyGlobal.prisma.mall_platform_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.sellerApprovalRequestId,
        },
        select: {
          id: true,
          mall_platform_seller_id: true,
        },
      },
    );
  if (approvalRequest.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const transformed =
    await MyGlobal.prisma.mall_platform_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.sellerApprovalRequestId,
        },
        ...MallPlatformSellerApprovalRequestTransformer.select(),
      },
    );
  return await MallPlatformSellerApprovalRequestTransformer.transform(
    transformed,
  );
}
