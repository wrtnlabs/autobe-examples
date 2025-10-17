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

export async function putShoppingMallAdminOrdersOrderIdStatusesStatusId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatus.IUpdate;
}): Promise<IShoppingMallOrderStatus> {
  const { admin, orderId, statusId, body } = props;

  // Find the order status record by statusId
  const existing =
    await MyGlobal.prisma.shopping_mall_order_statuses.findUniqueOrThrow({
      where: { id: statusId },
    });

  // Verify that the record belongs to the given orderId
  if (existing.shopping_mall_order_id !== orderId) {
    throw new HttpException("Not Found", 404);
  }

  // Update the status record by id
  const updated = await MyGlobal.prisma.shopping_mall_order_statuses.update({
    where: { id: statusId },
    data: {
      status: body.status,
      status_changed_at: body.status_changed_at,
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    status: updated.status,
    status_changed_at: toISOStringSafe(updated.status_changed_at),
  };
}
