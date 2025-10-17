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

export async function getShoppingMallAdminOrdersOrderIdStatusesStatusId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatus> {
  const { admin, orderId, statusId } = props;

  const record = await MyGlobal.prisma.shopping_mall_order_statuses.findFirst({
    where: {
      id: statusId,
      shopping_mall_order_id: orderId,
    },
  });

  if (!record) {
    throw new HttpException("Order status not found", 404);
  }

  return {
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    status: record.status,
    status_changed_at: toISOStringSafe(record.status_changed_at),
  };
}
