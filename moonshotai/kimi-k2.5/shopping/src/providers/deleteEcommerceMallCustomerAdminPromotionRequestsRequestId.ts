import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerAdminPromotionRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify customer is super_admin
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      id: props.customer.id,
      grade: "super_admin",
      deleted_at: null,
    },
  });
  if (admin === null) {
    throw new HttpException(
      "Only super administrators can delete promotion requests",
      403,
    );
  }
  // Find the promotion request
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: { id: true, status: true },
      },
    );
  // Only pending requests can be deleted
  if (request.status !== "pending") {
    throw new HttpException(
      "Only pending promotion requests can be deleted",
      400,
    );
  }
  // Soft delete the request
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.update({
    where: { id: props.requestId },
    data: {
      deleted_at: new Date(),
    },
  });
}
