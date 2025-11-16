import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerShoppingMallOrderCancellationsShoppingMallOrderCancellationId(props: {
  customer: CustomerPayload;
  shoppingMallOrderCancellationId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderCancellation.IUpdate;
}): Promise<IShoppingMallOrderCancellation> {
  const existing =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: props.shoppingMallOrderCancellationId },
    });

  if (!existing) {
    throw new HttpException("Order cancellation request not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_order_cancellations.update({
      where: { id: props.shoppingMallOrderCancellationId },
      data: {
        reason: props.body.reason,
        status: props.body.status,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    reason: updated.reason === null ? undefined : updated.reason,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
