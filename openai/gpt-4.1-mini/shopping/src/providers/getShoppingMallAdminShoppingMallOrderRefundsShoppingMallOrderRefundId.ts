import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallOrderRefundsShoppingMallOrderRefundId(props: {
  admin: AdminPayload;
  shoppingMallOrderRefundId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderRefund> {
  const refund = await MyGlobal.prisma.shopping_mall_order_refunds.findUnique({
    where: { id: props.shoppingMallOrderRefundId },
  });

  if (!refund)
    throw new HttpException("Shopping mall order refund not found", 404);

  return {
    id: refund.id,
    shoppingMallOrderId:
      refund.shopping_mall_order_id satisfies string as string,
    shoppingMallCustomerId:
      refund.shopping_mall_customer_id satisfies string as string,
    amount: refund.amount,
    status: typia.assert<"approved" | "pending" | "rejected">(refund.status),
    reason: refund.reason ?? "",
    createdAt: toISOStringSafe(refund.created_at),
    updatedAt: refund.updated_at
      ? toISOStringSafe(refund.updated_at)
      : undefined,
  };
}
