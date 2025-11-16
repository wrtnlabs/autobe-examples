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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderNumberAuditLogsAuditLogId(props: {
  seller: SellerPayload;
  orderNumber: string;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderAuditLog> {
  // 1. Validate order exists and is assigned to this seller
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      shopping_mall_seller_id: props.seller.id,
    },
  });
  if (!order) {
    throw new HttpException(
      "Order not found or not accessible by this seller.",
      404,
    );
  }

  // 2. Fetch the audit log for the order with given auditLogId
  const auditLog =
    await MyGlobal.prisma.shopping_mall_order_audit_logs.findFirst({
      where: {
        id: props.auditLogId,
        shopping_mall_order_id: order.id,
      },
    });
  if (!auditLog) {
    throw new HttpException("Audit log entry not found for this order.", 404);
  }

  // 3. Fetch all referenced actors in parallel (can be null)
  const [admin, seller, customer] = await Promise.all([
    auditLog.actor_admin_id
      ? MyGlobal.prisma.shopping_mall_admins.findFirst({
          where: { id: auditLog.actor_admin_id },
        })
      : Promise.resolve(null),
    auditLog.actor_seller_id
      ? MyGlobal.prisma.shopping_mall_sellers.findFirst({
          where: { id: auditLog.actor_seller_id },
        })
      : Promise.resolve(null),
    auditLog.actor_customer_id
      ? MyGlobal.prisma.shopping_mall_customers.findFirst({
          where: { id: auditLog.actor_customer_id },
        })
      : Promise.resolve(null),
  ]);

  // 4. Compose order summary for the DTO
  const orderSummary = {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    currency: order.currency,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
  };

  // 5. Compose actor summaries for the DTO (nullable/optional as DTO)
  const adminSummary = admin
    ? {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      }
    : undefined;
  const sellerSummary = seller
    ? {
        id: seller.id,
        business_name: seller.business_name,
      }
    : undefined;
  const customerSummary = customer
    ? {
        id: customer.id,
        name: customer.name,
      }
    : undefined;

  // 6. Construct final DTO
  return {
    id: auditLog.id,
    order: orderSummary,
    admin: typeof adminSummary !== "undefined" ? adminSummary : null,
    seller: typeof sellerSummary !== "undefined" ? sellerSummary : null,
    customer: typeof customerSummary !== "undefined" ? customerSummary : null,
    action_type: auditLog.action_type,
    details_json: auditLog.details_json ?? null,
    created_at: toISOStringSafe(auditLog.created_at),
  };
}
