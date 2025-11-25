import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAuditLog";
import { IPageIShoppingMallOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderNumberAuditLogs(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderAuditLog.IRequest;
}): Promise<IPageIShoppingMallOrderAuditLog.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: props.orderNumber, deleted_at: null },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  const sort_by = props.body.sort_by;
  const order_by = props.body.order_by;

  const created_atFilter =
    props.body.from_created_at && props.body.to_created_at
      ? { gte: props.body.from_created_at, lte: props.body.to_created_at }
      : props.body.from_created_at
        ? { gte: props.body.from_created_at }
        : props.body.to_created_at
          ? { lte: props.body.to_created_at }
          : undefined;

  const where = {
    shopping_mall_order_id: order.id,
    ...(props.body.action_type ? { action_type: props.body.action_type } : {}),
    ...(props.body.actor_admin_id
      ? { actor_admin_id: props.body.actor_admin_id }
      : {}),
    ...(props.body.actor_seller_id
      ? { actor_seller_id: props.body.actor_seller_id }
      : {}),
    ...(props.body.actor_customer_id
      ? { actor_customer_id: props.body.actor_customer_id }
      : {}),
    ...(created_atFilter ? { created_at: created_atFilter } : {}),
  };

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_audit_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort_by]: order_by },
      include: {
        order: true,
        adminActor: true,
        sellerActor: true,
        customerActor: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_audit_logs.count({
      where,
    }),
  ]);

  const summaries = logs.map((log) => ({
    id: log.id,
    order: {
      id: log.order.id,
      order_number: log.order.order_number,
      status: log.order.status,
      total_amount: log.order.total_amount,
      currency: log.order.currency,
      created_at: toISOStringSafe(log.order.created_at),
      updated_at: toISOStringSafe(log.order.updated_at),
      deleted_at:
        log.order.deleted_at === null
          ? undefined
          : toISOStringSafe(log.order.deleted_at),
    },
    actor_admin:
      log.adminActor !== null && log.adminActor !== undefined
        ? {
            id: log.adminActor.id,
            name: log.adminActor.name,
            email: log.adminActor.email,
          }
        : undefined,
    actor_seller:
      log.sellerActor !== null && log.sellerActor !== undefined
        ? {
            id: log.sellerActor.id,
            business_name: log.sellerActor.business_name,
          }
        : undefined,
    actor_customer:
      log.customerActor !== null && log.customerActor !== undefined
        ? {
            id: log.customerActor.id,
            name: log.customerActor.name,
          }
        : undefined,
    action_type: log.action_type,
    details_json: log.details_json === null ? undefined : log.details_json,
    created_at: toISOStringSafe(log.created_at),
  }));
  const pages = Math.ceil(total / limit);
  return {
    data: summaries,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  };
}
