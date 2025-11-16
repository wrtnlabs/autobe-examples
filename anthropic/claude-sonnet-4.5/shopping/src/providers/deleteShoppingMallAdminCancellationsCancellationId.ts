import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCancellationsCancellationId(props: {
  admin: AdminPayload;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: {
        id: props.cancellationId,
      },
    });

  if (!cancellation) {
    throw new HttpException("Order cancellation request not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_order_cancellations.delete({
    where: {
      id: props.cancellationId,
    },
  });
}
