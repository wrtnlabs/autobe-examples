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

export async function getShoppingMallAdminShoppingMallOrderCancellationsShoppingMallOrderCancellationId(props: {
  admin: AdminPayload;
  shoppingMallOrderCancellationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderCancellation> {
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: props.shoppingMallOrderCancellationId },
    });

  if (cancellation === null) {
    throw new HttpException("Shopping mall order cancellation not found", 404);
  }

  return {
    id: cancellation.id,
    shopping_mall_order_id: cancellation.shopping_mall_order_id,
    shopping_mall_customer_id: cancellation.shopping_mall_customer_id,
    reason:
      cancellation.reason === null || cancellation.reason === undefined
        ? undefined
        : cancellation.reason,
    status: cancellation.status,
    created_at: toISOStringSafe(cancellation.created_at),
    updated_at: toISOStringSafe(cancellation.updated_at),
    deleted_at:
      cancellation.deleted_at === null
        ? null
        : cancellation.deleted_at === undefined
          ? undefined
          : toISOStringSafe(cancellation.deleted_at),
  };
}
