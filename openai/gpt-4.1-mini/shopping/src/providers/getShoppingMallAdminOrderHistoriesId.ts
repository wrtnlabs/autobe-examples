import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrderHistoriesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderHistory> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.shopping_mall_order_histories.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    shopping_mall_order_id: record.shopping_mall_order_id,
    order_status: record.order_status,
    payment_status: record.payment_status,
    shipment_status: record.shipment_status,
    total_amount: record.total_amount,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
