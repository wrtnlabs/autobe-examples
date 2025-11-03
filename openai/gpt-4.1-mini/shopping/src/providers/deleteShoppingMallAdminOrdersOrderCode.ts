import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderCode(props: {
  admin: AdminPayload;
  orderCode: string;
}): Promise<void> {
  // Confirm order exists, will throw 404 if not found
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { order_code: props.orderCode },
  });

  // Hard delete order by orderCode
  await MyGlobal.prisma.shopping_mall_orders.delete({
    where: { order_code: props.orderCode },
  });
}
