import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequest";
import { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingRefundActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundActor";
import { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerRefundsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundRequest> {
  const refund = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
  });
  if (!refund) throw new HttpException("Refund request not found", 404);
  const items = await MyGlobal.prisma.shopping_refund_request_items.findMany({
    where: { shopping_refund_request_id: refund.id },
    orderBy: { created_at: "asc" },
  });
  if (items.length === 0) throw new HttpException("Refund items missing", 404);
  const orderLineIds = items.map((it) => it.shopping_order_line_id);
  const sellerOwnedOrderLines =
    await MyGlobal.prisma.shopping_order_lines.findMany({
      where: {
        id: { in: orderLineIds },
        shopping_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (sellerOwnedOrderLines.length === 0)
    throw new HttpException(
      "Forbidden: No access to this refund request for this seller",
      403,
    );
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { id: refund.shopping_order_id },
  });
  if (!order) throw new HttpException("Order not found", 404);
  const orderCustomer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: order.shopping_customer_id },
  });
  if (!orderCustomer) throw new HttpException("Order customer not found", 404);
  let actor: IShoppingRefundActor.ISummary;
  if (refund.actor_type === "seller") {
    const sellerActor = await MyGlobal.prisma.shopping_sellers.findUnique({
      where: { id: refund.shopping_actor_id },
    });
    if (!sellerActor) throw new HttpException("Seller actor not found", 404);
    actor = {
      actor_type: "seller",
      id: sellerActor.id,
      name: sellerActor.display_name,
    };
  } else if (refund.actor_type === "customer") {
    const customerActor = await MyGlobal.prisma.shopping_customers.findUnique({
      where: { id: refund.shopping_actor_id },
    });
    if (!customerActor)
      throw new HttpException("Customer actor not found", 404);
    actor = {
      actor_type: "customer",
      id: customerActor.id,
      name: customerActor.name,
    };
  } else if (refund.actor_type === "admin") {
    const adminActor = await MyGlobal.prisma.shopping_admins.findUnique({
      where: { id: refund.shopping_actor_id },
    });
    if (!adminActor) throw new HttpException("Admin actor not found", 404);
    actor = {
      actor_type: "admin",
      id: adminActor.id,
      name: adminActor.name,
    };
  } else {
    throw new HttpException("Unknown actor type", 500);
  }
  const orderSummary: IShoppingOrder.ISummary = {
    id: order.id,
    order_code: order.order_code,
    total_price: order.total_price,
    status: order.status,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    customer: {
      id: orderCustomer.id,
      name: orderCustomer.name,
      email: orderCustomer.email,
      is_active: orderCustomer.is_active,
      created_at: toISOStringSafe(orderCustomer.created_at),
      deleted_at: orderCustomer.deleted_at
        ? toISOStringSafe(orderCustomer.deleted_at)
        : null,
    },
  };
  const attachments =
    await MyGlobal.prisma.shopping_refund_attachments.findMany({
      where: { shopping_refund_request_id: refund.id },
      orderBy: { uploaded_at: "asc" },
    });
  const status_histories =
    await MyGlobal.prisma.shopping_refund_status_histories.findMany({
      where: { shopping_refund_request_id: refund.id },
      orderBy: { timestamp: "asc" },
    });
  const approvals = await MyGlobal.prisma.shopping_refund_approvals.findMany({
    where: { shopping_refund_request_id: refund.id },
    orderBy: { created_at: "asc" },
  });
  const admin_overrides =
    await MyGlobal.prisma.shopping_refund_admin_overrides.findMany({
      where: { shopping_refund_request_id: refund.id },
      orderBy: { created_at: "asc" },
    });
  // Items serialization (with attachment structure correction)
  const lineItemAttachmentsByItem: Record<string, IShoppingRefundAttachment[]> =
    {};
  for (const a of attachments) {
    if (a.shopping_refund_request_item_id) {
      const itemId = a.shopping_refund_request_item_id;
      if (!lineItemAttachmentsByItem[itemId])
        lineItemAttachmentsByItem[itemId] = [];
      lineItemAttachmentsByItem[itemId].push({
        id: a.id,
        shopping_refund_request_id: a.shopping_refund_request_id,
        shopping_refund_request_item_id: a.shopping_refund_request_item_id,
        attachment_file_id: a.attachment_file_id,
        attachment_type: a.attachment_type,
        description: a.description ?? undefined,
        uploaded_at: toISOStringSafe(a.uploaded_at),
        file_uri: "file_uri" in a ? (a as any).file_uri : undefined,
        file_type: "file_type" in a ? (a as any).file_type : undefined,
        file_size: "file_size" in a ? (a as any).file_size : undefined,
      });
    }
  }
  const itemsDto: IShoppingRefundRequestItem[] = items.map((item) => ({
    id: item.id,
    shopping_refund_request_id: item.shopping_refund_request_id,
    shopping_order_id: item.shopping_order_id,
    shopping_order_line_id: item.shopping_order_line_id,
    quantity: item.quantity,
    item_business_reason: item.item_business_reason ?? undefined,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    attachments: lineItemAttachmentsByItem[item.id] ?? undefined,
  }));
  // Only those attachments not tied to item
  const requestAttachments: IShoppingRefundAttachment[] = attachments
    .filter((a) => !a.shopping_refund_request_item_id)
    .map((a) => ({
      id: a.id,
      shopping_refund_request_id: a.shopping_refund_request_id,
      shopping_refund_request_item_id: undefined,
      attachment_file_id: a.attachment_file_id,
      attachment_type: a.attachment_type,
      description: a.description ?? undefined,
      uploaded_at: toISOStringSafe(a.uploaded_at),
      file_uri: "file_uri" in a ? (a as any).file_uri : undefined,
      file_type: "file_type" in a ? (a as any).file_type : undefined,
      file_size: "file_size" in a ? (a as any).file_size : undefined,
    }));
  // Status histories mapping
  const statusHistoriesDto: IShoppingRefundStatusHistory[] =
    status_histories.map((h) => ({
      id: h.id,
      shopping_refund_request_id: h.shopping_refund_request_id,
      shopping_actor_id: h.shopping_actor_id,
      actor_type: typia.assert<"customer" | "seller" | "admin">(h.actor_type),
      previous_status: typia.assert<
        | "pending"
        | "awaiting_approval"
        | "approved"
        | "declined"
        | "completed"
        | "escalated"
      >(h.previous_status),
      new_status: typia.assert<
        | "pending"
        | "awaiting_approval"
        | "approved"
        | "declined"
        | "completed"
        | "escalated"
      >(h.new_status),
      timestamp: toISOStringSafe(h.timestamp),
      change_context: h.change_context ?? undefined,
    }));
  // Approvals mapping
  const approvalsDto: IShoppingRefundApproval[] = approvals.map((a) => ({
    id: a.id,
    shopping_refund_request_id: a.shopping_refund_request_id,
    shopping_refund_status_history_id: a.shopping_refund_status_history_id,
    actor_type: typia.assert<"customer" | "seller" | "admin">(a.actor_type),
    actor_id: a.shopping_actor_id,
    action: typia.assert<"approved" | "rejected">(a.action),
    note: a.note ?? undefined,
    created_at: toISOStringSafe(a.created_at),
  }));
  // Admin overrides mapping
  const adminOverridesDto: IShoppingRefundAdminOverride[] = admin_overrides.map(
    (o) => ({
      id: o.id,
      shopping_refund_request_id: o.shopping_refund_request_id,
      shopping_admin_id: o.shopping_admin_id,
      override_type: typia.assert<"force_accept" | "force_reject" | "reassign">(
        o.override_type,
      ),
      reason: o.reason,
      detailed_context: o.detailed_context ?? undefined,
      created_at: toISOStringSafe(o.created_at),
    }),
  );
  return {
    id: refund.id,
    order: orderSummary,
    actor: actor,
    request_type: typia.assert<"refund" | "return" | "cancellation">(
      refund.request_type,
    ),
    business_reason: refund.business_reason,
    request_context: refund.request_context ?? undefined,
    status: typia.assert<
      | "pending"
      | "awaiting_approval"
      | "approved"
      | "declined"
      | "completed"
      | "escalated"
    >(refund.status),
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
    deleted_at: refund.deleted_at
      ? toISOStringSafe(refund.deleted_at)
      : undefined,
    items: itemsDto,
    attachments: requestAttachments,
    status_histories: statusHistoriesDto,
    approvals: approvalsDto,
    admin_overrides: adminOverridesDto,
  };
}
