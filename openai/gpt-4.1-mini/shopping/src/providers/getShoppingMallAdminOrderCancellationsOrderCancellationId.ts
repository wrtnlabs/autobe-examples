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
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: props.orderCancellationId },
    });

  if (!cancellation) {
    throw new HttpException("Order cancellation request not found", 404);
  }

  return {
    id: cancellation.id,
    shopping_mall_order_id: cancellation.shopping_mall_order_id,
    cancellation_reason: cancellation.cancellation_reason,
    cancellation_status: cancellation.cancellation_status,
    requested_at: toISOStringSafe(cancellation.requested_at),
    processed_at: cancellation.processed_at
      ? toISOStringSafe(cancellation.processed_at)
      : null,
    created_at: toISOStringSafe(cancellation.created_at),
    updated_at: toISOStringSafe(cancellation.updated_at),
    deleted_at: cancellation.deleted_at
      ? toISOStringSafe(cancellation.deleted_at)
      : null,
  } as unknown as IShoppingMallOrderCancellation;
}
