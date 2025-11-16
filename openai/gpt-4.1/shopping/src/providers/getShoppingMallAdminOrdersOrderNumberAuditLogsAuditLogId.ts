import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAuditLog";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderNumberAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  orderNumber: string;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderAuditLog> {
  // 1. Find order by orderNumber
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: props.orderNumber },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Find audit log by auditLogId and check it belongs to the order
  const auditLog =
    await MyGlobal.prisma.shopping_mall_order_audit_logs.findUnique({
      where: { id: props.auditLogId },
    });
  if (!auditLog || auditLog.shopping_mall_order_id !== order.id) {
    throw new HttpException("Audit log not found for this order", 404);
  }

  // 3. Resolve actor summaries (admin, seller, customer)
  let adminSummary = undefined;
  if (auditLog.actor_admin_id) {
    const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: auditLog.actor_admin_id },
      select: { id: true, name: true, email: true },
    });
    if (admin) {
      adminSummary = { id: admin.id, name: admin.name, email: admin.email };
    } else {
      adminSummary = null;
    }
  }
  let sellerSummary = undefined;
  if (auditLog.actor_seller_id) {
    const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: auditLog.actor_seller_id },
      select: { id: true, business_name: true },
    });
    if (seller) {
      sellerSummary = { id: seller.id, business_name: seller.business_name };
    } else {
      sellerSummary = null;
    }
  }
  let customerSummary = undefined;
  if (auditLog.actor_customer_id) {
    const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: auditLog.actor_customer_id },
      select: { id: true, name: true },
    });
    if (customer) {
      customerSummary = { id: customer.id, name: customer.name };
    } else {
      customerSummary = null;
    }
  }
  // 4. Build order summary
  const orderSummary: IShoppingMallOrder.ISummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
  };
  // 5. Compose result per DTO
  return {
    id: auditLog.id,
    order: orderSummary,
    admin: adminSummary,
    seller: sellerSummary,
    customer: customerSummary,
    action_type: auditLog.action_type,
    details_json:
      auditLog.details_json === null
        ? null
        : (auditLog.details_json ?? undefined),
    created_at: toISOStringSafe(auditLog.created_at),
  };
}
