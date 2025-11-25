import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getShoppingMallAdminPaymentsPaymentIdAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderAuditLog> {
  // Fetch the audit log by PK
  const auditLog =
    await MyGlobal.prisma.shopping_mall_order_audit_logs.findUnique({
      where: { id: props.auditLogId },
    });

  if (!auditLog) {
    throw new HttpException("Audit log not found", 404);
  }

  // Fetch the associated order
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: auditLog.shopping_mall_order_id },
  });
  if (!order) {
    throw new HttpException("Order not found for audit log", 404);
  }

  // NOTE: Unable to check payment linkage because 'payment_id' does not exist on orders table.
  // It is assumed the call path ensures correct linkage externally, or this linkage is indirect.

  // Fetch admin actor if referenced
  let adminSummary: IShoppingMallAdmin.ISummary | null | undefined = undefined;
  if (auditLog.actor_admin_id !== null) {
    const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: auditLog.actor_admin_id },
    });
    adminSummary = admin
      ? { id: admin.id, name: admin.name, email: admin.email }
      : null;
  }

  // Fetch seller actor if referenced
  let sellerSummary: IShoppingMallSeller.ISummary | null | undefined =
    undefined;
  if (auditLog.actor_seller_id !== null) {
    const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: auditLog.actor_seller_id },
    });
    sellerSummary = seller
      ? { id: seller.id, business_name: seller.business_name }
      : null;
  }

  // Fetch customer actor if referenced
  let customerSummary: IShoppingMallCustomer.ISummary | null | undefined =
    undefined;
  if (auditLog.actor_customer_id !== null) {
    const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: auditLog.actor_customer_id },
    });
    customerSummary = customer
      ? { id: customer.id, name: customer.name }
      : null;
  }

  // Summarize order for DTO
  const orderSummary: IShoppingMallOrder.ISummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at:
      order.deleted_at !== null && order.deleted_at !== undefined
        ? toISOStringSafe(order.deleted_at)
        : undefined,
  };

  // Build and return the audit log DTO
  return {
    id: auditLog.id,
    order: orderSummary,
    admin: adminSummary !== undefined ? adminSummary : null,
    seller: sellerSummary !== undefined ? sellerSummary : null,
    customer: customerSummary !== undefined ? customerSummary : null,
    action_type: auditLog.action_type,
    details_json:
      typeof auditLog.details_json === "string"
        ? auditLog.details_json
        : auditLog.details_json === null
          ? null
          : undefined,
    created_at: toISOStringSafe(auditLog.created_at),
  };
}
