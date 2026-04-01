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

export async function getMallPlatformAdministratorSellerApprovalRequestsSellerApprovalRequestId(props: {
  administrator: AdministratorPayload;
  sellerApprovalRequestId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSellerApprovalRequest> {
  await MyGlobal.prisma.mall_platform_administrators.findUniqueOrThrow({
    where: {
      id: props.administrator.id,
    },
  });
  const record =
    await MyGlobal.prisma.mall_platform_seller_approval_requests.findUniqueOrThrow(
      {
        where: {
          id: props.sellerApprovalRequestId,
        },
        ...MallPlatformSellerApprovalRequestTransformer.select(),
      },
    );
  return await MallPlatformSellerApprovalRequestTransformer.transform(record);
}
