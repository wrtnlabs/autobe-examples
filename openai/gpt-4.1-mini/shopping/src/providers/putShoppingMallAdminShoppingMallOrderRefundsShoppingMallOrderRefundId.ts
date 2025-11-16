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

export async function putShoppingMallAdminShoppingMallOrderRefundsShoppingMallOrderRefundId(props: {
  admin: AdminPayload;
  shoppingMallOrderRefundId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderRefund.IUpdate;
}): Promise<IShoppingMallOrderRefund> {
  const existing = await MyGlobal.prisma.shopping_mall_order_refunds.findUnique(
    {
      where: { id: props.shoppingMallOrderRefundId },
    },
  );

  if (!existing) {
    throw new HttpException("Order refund not found", 404);
  }

  const now = new Date();
  const updated = await MyGlobal.prisma.shopping_mall_order_refunds.update({
    where: { id: props.shoppingMallOrderRefundId },
    data: {
      status: props.body.status,
      updated_at: toISOStringSafe(now),
    },
  });

  return {
    id: updated.id,
    shoppingMallOrderId: updated.shopping_mall_order_id,
    shoppingMallCustomerId:
      updated.shopping_mall_customer_id satisfies string as string,
    amount: updated.amount,
    status: typia.assert<"pending" | "approved" | "rejected">(
      props.body.status,
    ),
    reason: updated.reason ?? "",
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
  } satisfies IShoppingMallOrderRefund;
}
