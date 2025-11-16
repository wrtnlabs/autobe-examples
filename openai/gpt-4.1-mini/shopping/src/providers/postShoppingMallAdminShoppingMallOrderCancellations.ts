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

export async function postShoppingMallAdminShoppingMallOrderCancellations(props: {
  admin: AdminPayload;
  body: IShoppingMallOrderCancellation.ICreate;
}): Promise<IShoppingMallOrderCancellation> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.body.shopping_mall_order_id },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_order_cancellations.create({
      data: {
        id: v4(),
        shopping_mall_order_id: props.body.shopping_mall_order_id,
        shopping_mall_customer_id: order.shopping_mall_customer_id,
        reason: props.body.reason ?? undefined,
        status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    reason: created.reason ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
