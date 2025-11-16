import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerShoppingMallOrderCancellationsShoppingMallOrderCancellationId(props: {
  seller: SellerPayload;
  shoppingMallOrderCancellationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderCancellation> {
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: props.shoppingMallOrderCancellationId },
    });

  if (cancellation === null) {
    throw new HttpException("Shopping Mall Order Cancellation not found", 404);
  }

  return {
    id: cancellation.id,
    shopping_mall_order_id: cancellation.shopping_mall_order_id,
    shopping_mall_customer_id: cancellation.shopping_mall_customer_id,
    reason: cancellation.reason ?? undefined,
    status: cancellation.status,
    created_at: toISOStringSafe(cancellation.created_at),
    updated_at: toISOStringSafe(cancellation.updated_at),
    deleted_at: cancellation.deleted_at
      ? toISOStringSafe(cancellation.deleted_at)
      : null,
  };
}
