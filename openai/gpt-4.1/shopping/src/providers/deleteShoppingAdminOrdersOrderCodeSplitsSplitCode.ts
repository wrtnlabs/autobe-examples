import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminOrdersOrderCodeSplitsSplitCode(props: {
  admin: AdminPayload;
  orderCode: string;
  splitCode: string;
}): Promise<void> {
  // Step 1: Find the parent order by orderCode
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: props.orderCode },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Not found", 404);
  }

  // Step 2: Find split (by splitCode, orderId, and not deleted)
  const split = await MyGlobal.prisma.shopping_order_splits.findFirst({
    where: {
      split_code: props.splitCode,
      shopping_order_id: order.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!split) {
    throw new HttpException("Not found", 404);
  }

  // Step 3: Soft-delete split (set deleted_at)
  await MyGlobal.prisma.shopping_order_splits.update({
    where: { id: split.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
