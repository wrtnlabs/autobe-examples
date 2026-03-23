import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminSellerApprovalRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_seller_approval_requests.findUniqueOrThrow(
    {
      where: {
        id: props.requestId,
        deleted_at: null,
      },
    },
  );
  await MyGlobal.prisma.shopping_mall_seller_approval_requests.update({
    where: { id: props.requestId },
    data: {
      deleted_at: new Date(),
    },
  });
}
