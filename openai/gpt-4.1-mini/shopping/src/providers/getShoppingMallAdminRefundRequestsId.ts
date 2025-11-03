import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminRefundRequestsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const { id } = props;

  const refund = await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
    where: {
      id,
    },
  });

  if (!refund) {
    throw new HttpException("Refund request not found", 404);
  }

  return {
    id: refund.id,
    shopping_mall_order_id: refund.shopping_mall_order_id,
    shopping_mall_customer_id: refund.shopping_mall_customer_id,
    refund_amount: refund.refund_amount,
    refund_reason: refund.refund_reason ?? null,
    refund_status: refund.refund_status,
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
  };
}
