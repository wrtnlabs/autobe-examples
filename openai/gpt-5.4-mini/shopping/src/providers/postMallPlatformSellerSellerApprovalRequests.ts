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
import { MallPlatformSellerApprovalRequestCollector } from "../collectors/MallPlatformSellerApprovalRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformSellerApprovalRequestTransformer } from "../transformers/MallPlatformSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IMallPlatformSellerApprovalRequest.ICreate;
}): Promise<IMallPlatformSellerApprovalRequest> {
  const created =
    await MyGlobal.prisma.mall_platform_seller_approval_requests.create({
      data: await MallPlatformSellerApprovalRequestCollector.collect({
        body: props.body,
        seller: props.seller,
      }),
      ...MallPlatformSellerApprovalRequestTransformer.select(),
    });
  return await MallPlatformSellerApprovalRequestTransformer.transform(created);
}
