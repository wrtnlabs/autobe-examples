import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string;
  itemId: string;
}): Promise<void> {
  const item = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.itemId,
      order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (item === null) {
    throw new HttpException("Order item not found or already deleted", 404);
  }
  if (item.status === "shipped" || item.status === "delivered") {
    throw new HttpException(
      "Cannot delete order items with status 'shipped' or 'delivered'. Use cancellation or refund workflows instead.",
      400,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      deleted_at: new Date(),
    },
  });
}
