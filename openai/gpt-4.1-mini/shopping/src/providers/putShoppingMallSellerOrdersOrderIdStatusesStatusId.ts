import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderIdStatusesStatusId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatus.IUpdate;
}): Promise<IShoppingMallOrderStatus> {
  const { orderId, statusId, body } = props;

  try {
    const updated = await MyGlobal.prisma.shopping_mall_order_statuses.update({
      where: {
        id: statusId,
        shopping_mall_order_id: orderId,
      },
      data: {
        status: body.status,
        status_changed_at: toISOStringSafe(body.status_changed_at),
      },
      select: {
        id: true,
        shopping_mall_order_id: true,
        status: true,
        status_changed_at: true,
      },
    });

    return {
      id: updated.id,
      shopping_mall_order_id: updated.shopping_mall_order_id,
      status: updated.status,
      status_changed_at: toISOStringSafe(updated.status_changed_at),
    };
  } catch {
    throw new HttpException("Order status not found", 404);
  }
}
