import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderIdStatuses(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatus.ICreate;
}): Promise<IShoppingMallOrderStatus> {
  const { admin, orderId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }

  const created = await MyGlobal.prisma.shopping_mall_order_statuses.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: orderId,
      status: body.status,
      status_changed_at: body.status_changed_at,
    } satisfies typeof MyGlobal.prisma.shopping_mall_order_statuses.create extends (
      args: infer A,
    ) => any
      ? A extends { data: infer D }
        ? D
        : never
      : never,
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    status: created.status,
    status_changed_at: toISOStringSafe(created.status_changed_at),
  };
}
