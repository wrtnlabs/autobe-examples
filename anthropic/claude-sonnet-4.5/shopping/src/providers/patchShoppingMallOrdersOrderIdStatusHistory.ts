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

export async function patchShoppingMallOrdersOrderIdStatusHistory(props: {
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  const { orderId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    shopping_mall_order_id: orderId,
    ...((body.start_date || body.end_date) && {
      created_at: {
        ...(body.start_date && { gte: body.start_date }),
        ...(body.end_date && { lte: body.end_date }),
      },
    }),
    ...(body.new_status && {
      new_status: body.new_status,
    }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_history.findMany({
      where: whereCondition,
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_status_history.count({
      where: whereCondition,
    }),
  ]);

  const data: IShoppingMallOrderStatusHistory[] = results.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    shopping_mall_order_id: record.shopping_mall_order_id as string &
      tags.Format<"uuid">,
    shopping_mall_customer_id:
      record.shopping_mall_customer_id === null
        ? undefined
        : (record.shopping_mall_customer_id as
            | (string & tags.Format<"uuid">)
            | undefined),
    shopping_mall_seller_id:
      record.shopping_mall_seller_id === null
        ? undefined
        : (record.shopping_mall_seller_id as
            | (string & tags.Format<"uuid">)
            | undefined),
    shopping_mall_admin_id:
      record.shopping_mall_admin_id === null
        ? undefined
        : (record.shopping_mall_admin_id as
            | (string & tags.Format<"uuid">)
            | undefined),
    previous_status:
      record.previous_status === null ? undefined : record.previous_status,
    new_status: record.new_status,
    change_reason:
      record.change_reason === null ? undefined : record.change_reason,
    notes: record.notes === null ? undefined : record.notes,
    is_system_generated: record.is_system_generated,
    created_at: toISOStringSafe(record.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
