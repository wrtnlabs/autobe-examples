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

export async function putShoppingMallCustomerOrderCancellationsOrderCancellationId(props: {
  customer: CustomerPayload;
  orderCancellationId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderCancellation.IUpdate;
}): Promise<IShoppingMallOrderCancellation> {
  const existing =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: props.orderCancellationId },
    });

  if (existing === null) {
    throw new HttpException("Order cancellation request not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_order_cancellations.update({
    where: { id: props.orderCancellationId },
    data: {
      cancellation_reason: props.body.cancellation_reason,
      cancellation_status: props.body.cancellation_status,
      processed_at: props.body.processed_at ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return typia.random<IShoppingMallOrderCancellation>();
}
