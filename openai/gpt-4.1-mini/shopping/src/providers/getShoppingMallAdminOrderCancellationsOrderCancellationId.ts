import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrderCancellationsOrderCancellationId(props: {
  admin: AdminPayload;
  orderCancellationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderCancellation> {
  const { orderCancellationId } = props;

  const record =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: orderCancellationId },
    });

  if (!record) {
    throw new HttpException("Order cancellation not found", 404);
  }

  return {
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    cancellation_reason: record.cancellation_reason ?? null,
    cancellation_status: record.cancellation_status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
