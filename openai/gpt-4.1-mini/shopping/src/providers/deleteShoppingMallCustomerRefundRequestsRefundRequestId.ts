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

export async function deleteShoppingMallCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });
  if (refundRequest === null || refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Refund request not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
