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

export async function deleteEcommerceMallCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string;
}): Promise<void> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        customer_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (refundRequest.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden - You can only cancel your own refund requests",
      403,
    );
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Cannot cancel a refund request that has already been responded to",
      400,
    );
  }
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request has already been cancelled", 400);
  }
  await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
