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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingCustomerRefundsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundRequest> {
  const refund = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
    include: {
      order: {
        select: {
          id: true,
          order_code: true,
          total_price: true,
          status: true,
          created_at: true,
          updated_at: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              is_active: true,
              created_at: true,
              deleted_at: true,
            },
          },
        },
      },
      actor: { select: { id: true, name: true } },
    },
  });
  if (!refund) throw new HttpException("Refund request not found", 404);
  if (
    !(
      refund.actor_type === "customer" &&
      refund.shopping_actor_id === props.customer.id
    )
  ) {
    throw new HttpException(
      "Forbidden: Access to this refund request is denied",
      403,
    );
  }
  // Load subcollections
  const [items, attachments, status_histories, approvals, admin_overrides] =
    await Promise.all([
      MyGlobal.prisma.shopping_refund_request_items.findMany({
        where: { shopping_refund_request_id: refund.id },
      }),
      MyGlobal.prisma.shopping_refund_attachments.findMany({
        where: { shopping_refund_request_id: refund.id },
        include: {
          attachmentFile: {
            select: { image_uri: true },
          },
        },
      }),
      MyGlobal.prisma.shopping_refund_status_histories.findMany({
        where: { shopping_refund_request_id: refund.id },
      }),
      MyGlobal.prisma.shopping_refund_approvals.findMany({
        where: { shopping_refund_request_id: refund.id },
      }),
      MyGlobal.prisma.shopping_refund_admin_overrides.findMany({
        where: { shopping_refund_request_id: refund.id },
      }),
    ]);
  return {
    id: refund.id,
    order: {
      id: refund.order.id,
      order_code: refund.order.order_code,
      total_price: refund.order.total_price,
      status: refund.order.status,
      created_at: toISOStringSafe(refund.order.created_at),
      updated_at: toISOStringSafe(refund.order.updated_at),
      customer: {
        id: refund.order.customer.id,
        name: refund.order.customer.name,
        email: refund.order.customer.email,
        is_active: refund.order.customer.is_active,
        created_at: toISOStringSafe(refund.order.customer.created_at),
        deleted_at: refund.order.customer.deleted_at
          ? toISOStringSafe(refund.order.customer.deleted_at)
          : null,
      },
    },
    actor: {
      actor_type: refund.actor_type as "customer" | "seller" | "admin",
      id: refund.shopping_actor_id,
      name: refund.actor.name,
    },
    request_type: refund.request_type as "refund" | "return" | "cancellation",
    business_reason: refund.business_reason,
    request_context: refund.request_context ?? null,
    status: refund.status,
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
    deleted_at: refund.deleted_at
      ? toISOStringSafe(refund.deleted_at)
      : undefined,
    items: items.map(
      (item): IShoppingRefundRequestItem => ({
        id: item.id,
        shopping_refund_request_id: item.shopping_refund_request_id,
        shopping_order_id: item.shopping_order_id,
        shopping_order_line_id: item.shopping_order_line_id,
        quantity: item.quantity,
        item_business_reason: item.item_business_reason ?? null,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        attachments: attachments
          .filter((att) => att.shopping_refund_request_item_id === item.id)
          .map((att) => ({
            id: att.id,
            shopping_refund_request_id: att.shopping_refund_request_id,
            shopping_refund_request_item_id:
              att.shopping_refund_request_item_id ?? null,
            attachment_file_id: att.attachment_file_id,
            attachment_type: att.attachment_type,
            description: att.description ?? undefined,
            uploaded_at: toISOStringSafe(att.uploaded_at),
            file_uri: att.attachmentFile ? att.attachmentFile.image_uri : "",
            file_type: "", // File type unknown (not available from file relation)
            file_size: 0, // File size unknown (not available)
          })),
      }),
    ),
    attachments: attachments
      .filter((att) => !att.shopping_refund_request_item_id)
      .map((att) => ({
        id: att.id,
        shopping_refund_request_id: att.shopping_refund_request_id,
        shopping_refund_request_item_id: undefined,
        attachment_file_id: att.attachment_file_id,
        attachment_type: att.attachment_type,
        description: att.description ?? undefined,
        uploaded_at: toISOStringSafe(att.uploaded_at),
        file_uri: att.attachmentFile ? att.attachmentFile.image_uri : "",
        file_type: "", // Not available
        file_size: 0,
      })),
    status_histories: status_histories.map((h) => ({
      id: h.id,
      shopping_refund_request_id: h.shopping_refund_request_id,
      shopping_actor_id: h.shopping_actor_id,
      actor_type: h.actor_type as "customer" | "seller" | "admin",
      previous_status: h.previous_status,
      new_status: h.new_status,
      timestamp: toISOStringSafe(h.timestamp),
      change_context: h.change_context ?? undefined,
    })),
    approvals: approvals.map((a) => ({
      id: a.id,
      shopping_refund_request_id: a.shopping_refund_request_id,
      shopping_refund_status_history_id: a.shopping_refund_status_history_id,
      actor_type: a.actor_type,
      actor_id: a.shopping_actor_id, // Correction for actor_id
      action: a.action,
      note: a.note ?? undefined,
      created_at: toISOStringSafe(a.created_at),
    })),
    admin_overrides: admin_overrides.map((o) => ({
      id: o.id,
      shopping_refund_request_id: o.shopping_refund_request_id,
      shopping_admin_id: o.shopping_admin_id,
      override_type: o.override_type,
      reason: o.reason,
      detailed_context: o.detailed_context ?? undefined,
      created_at: toISOStringSafe(o.created_at),
    })),
  };
}
