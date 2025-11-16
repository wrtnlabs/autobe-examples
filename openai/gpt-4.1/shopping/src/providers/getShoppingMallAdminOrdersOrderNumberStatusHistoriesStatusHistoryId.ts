import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderNumberStatusHistoriesStatusHistoryId(props: {
  admin: AdminPayload;
  orderNumber: string;
  statusHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatusHistory> {
  // Find the order by order number
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: props.orderNumber },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Find the specific status history entry for this order
  const history =
    await MyGlobal.prisma.shopping_mall_order_status_histories.findUnique({
      where: { id: props.statusHistoryId },
      include: {
        adminActor: true,
        sellerActor: true,
        customerActor: true,
      },
    });
  if (!history || history.shopping_mall_order_id !== order.id) {
    throw new HttpException(
      "Status history record not found for this order",
      404,
    );
  }

  return {
    id: history.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    },
    from_status: history.from_status,
    to_status: history.to_status,
    comment: history.comment ?? undefined,
    created_at: toISOStringSafe(history.created_at),
    admin: history.adminActor
      ? {
          id: history.adminActor.id,
          name: history.adminActor.name,
          email: history.adminActor.email,
        }
      : undefined,
    seller: history.sellerActor
      ? {
          id: history.sellerActor.id,
          business_name: history.sellerActor.business_name,
        }
      : undefined,
    customer: history.customerActor
      ? {
          id: history.customerActor.id,
          name: history.customerActor.name,
        }
      : undefined,
  };
}
