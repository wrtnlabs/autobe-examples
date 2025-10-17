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

export async function patchShoppingMallSellerOrdersOrderIdStatuses(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatus.IUpdate;
}): Promise<IShoppingMallOrderStatus> {
  const { seller, orderId, body } = props;

  const created = await MyGlobal.prisma.shopping_mall_order_statuses.create({
    data: {
      id: v4(),
      shopping_mall_order_id: orderId,
      status: body.status,
      status_changed_at: body.status_changed_at,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    status: created.status,
    status_changed_at: toISOStringSafe(created.status_changed_at),
  };
}
