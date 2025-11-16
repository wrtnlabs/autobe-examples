import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdStatusHistories(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.from_date) {
    createdAtFilter.gte = new Date(props.body.from_date);
  }
  if (props.body.to_date) {
    createdAtFilter.lte = new Date(props.body.to_date);
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_histories.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        ...(props.body.status && { new_status: props.body.status }),
        ...(Object.keys(createdAtFilter).length > 0 && {
          created_at: createdAtFilter,
        }),
      },
      skip,
      take: limit,
      orderBy: {
        [props.body.sort_by ?? "created_at"]: props.body.order ?? "desc",
      },
    }),
    MyGlobal.prisma.shopping_mall_order_status_histories.count({
      where: {
        shopping_mall_order_id: props.orderId,
        ...(props.body.status && { new_status: props.body.status }),
        ...(Object.keys(createdAtFilter).length > 0 && {
          created_at: createdAtFilter,
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      shopping_mall_order_id: record.shopping_mall_order_id,
      shopping_mall_order_seller_id:
        record.shopping_mall_order_seller_id ?? undefined,
      previous_status: record.previous_status ?? undefined,
      new_status: record.new_status,
      actor_type: record.actor_type,
      actor_id: record.actor_id ?? undefined,
      change_reason: record.change_reason ?? undefined,
      ip_address: record.ip_address ?? undefined,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
