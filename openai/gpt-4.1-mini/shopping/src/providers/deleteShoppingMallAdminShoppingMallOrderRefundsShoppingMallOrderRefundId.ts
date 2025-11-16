import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallOrderRefundsShoppingMallOrderRefundId(props: {
  admin: AdminPayload;
  shoppingMallOrderRefundId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_order_refunds.findUnique(
    {
      where: { id: props.shoppingMallOrderRefundId },
    },
  );

  if (!existing) {
    throw new HttpException("Shopping mall order refund not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_order_refunds.delete({
    where: { id: props.shoppingMallOrderRefundId },
  });
}
