import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallSellerAdminPromotionRequestsRequestId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          deleted_at: true,
        },
      },
    );
  if (request.deleted_at !== null) {
    throw new HttpException("Request not found", 404);
  }
  if (request.status === "approved") {
    throw new HttpException("Cannot delete approved promotion request", 400);
  }
  if (request.status === "rejected") {
    throw new HttpException("Cannot delete rejected promotion request", 400);
  }
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.update({
    where: { id: props.requestId },
    data: {
      deleted_at: new Date(),
    },
  });
}
