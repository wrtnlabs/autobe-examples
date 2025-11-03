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

export async function putShoppingCustomerRefundsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundRequest.IUpdate;
}): Promise<IShoppingRefundRequest> {
  // Fetch and verify refund ownership, editable status, and existence
  const refund = await MyGlobal.prisma.shopping_refund_requests.findFirst({
    where: {
      id: props.refundRequestId,
      deleted_at: null,
      actor_type: "customer",
      shopping_actor_id: props.customer.id,
    },
    include: {
      order: true,
    },
  });
  if (!refund) {
    throw new HttpException(
      "Refund request not found, does not belong to you, or already deleted",
      404,
    );
  }
  const finalizedStatuses = ["approved", "completed", "declined"];
  if (finalizedStatuses.includes(refund.status)) {
    throw new HttpException(
      "Cannot update refund/cancellation request once finalized.",
      400,
    );
  }

  // Update updatable fields only
  const updated = await MyGlobal.prisma.shopping_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      business_reason: props.body.business_reason ?? undefined,
      status: props.body.status ?? undefined,
      request_context: props.body.request_context ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      order: true,
    },
  });

  // Retrieve all relation data needed for the DTO
  const [
    customerRec,
    items,
    attachments,
    statusHistories,
    approvals,
    adminOverrides,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_customers.findUniqueOrThrow({
      where: { id: updated.shopping_actor_id },
    }),
    MyGlobal.prisma.shopping_refund_request_items.findMany({
      where: { shopping_refund_request_id: updated.id },
    }),
    MyGlobal.prisma.shopping_refund_attachments.findMany({
      where: { shopping_refund_request_id: updated.id },
    }),
    MyGlobal.prisma.shopping_refund_status_histories.findMany({
      where: { shopping_refund_request_id: updated.id },
    }),
    MyGlobal.prisma.shopping_refund_approvals.findMany({
      where: { shopping_refund_request_id: updated.id },
    }),
    MyGlobal.prisma.shopping_refund_admin_overrides.findMany({
      where: { shopping_refund_request_id: updated.id },
    }),
  ]);

  // Compose order summary
  const orderSummary = {
    id: updated.order.id,
    order_code: updated.order.order_code,
    total_price: updated.order.total_price,
    status: updated.order.status,
    created_at: toISOStringSafe(updated.order.created_at),
    updated_at: toISOStringSafe(updated.order.updated_at),
    customer: {
      id: customerRec.id,
      name: customerRec.name,
      email: customerRec.email,
      is_active: customerRec.is_active,
      created_at: toISOStringSafe(customerRec.created_at),
      deleted_at: customerRec.deleted_at
        ? toISOStringSafe(customerRec.deleted_at)
        : null,
    },
  };

  // Compose actor summary
  const actorSummary = {
    actor_type: typia.assert<"customer" | "seller" | "admin">("customer"),
    id: customerRec.id,
    name: customerRec.name,
  };

  // Map refund items array (with inline attachments per item)
  const itemsArr = items.map((item) => {
    const itemAttachments = attachments
      .filter((att) => att.shopping_refund_request_item_id === item.id)
      .map((att) => ({
        id: att.id,
        shopping_refund_request_id: att.shopping_refund_request_id,
        shopping_refund_request_item_id:
          att.shopping_refund_request_item_id ?? undefined,
        attachment_file_id: att.attachment_file_id,
        attachment_type: att.attachment_type,
        description: att.description ?? undefined,
        uploaded_at: toISOStringSafe(att.uploaded_at),
        file_uri: "", // details unavailable, must be patched externally
        file_type: "",
        file_size: 0,
      }));
    return {
      id: item.id,
      shopping_refund_request_id: item.shopping_refund_request_id,
      shopping_order_id: item.shopping_order_id,
      shopping_order_line_id: item.shopping_order_line_id,
      quantity: item.quantity,
      item_business_reason: item.item_business_reason ?? undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      attachments: itemAttachments.length > 0 ? itemAttachments : undefined,
    };
  });

  // Top-level (non-item) attachments
  const topLevelAttachments = attachments
    .filter((att) => att.shopping_refund_request_item_id == null)
    .map((att) => ({
      id: att.id,
      shopping_refund_request_id: att.shopping_refund_request_id,
      shopping_refund_request_item_id:
        att.shopping_refund_request_item_id ?? undefined,
      attachment_file_id: att.attachment_file_id,
      attachment_type: att.attachment_type,
      description: att.description ?? undefined,
      uploaded_at: toISOStringSafe(att.uploaded_at),
      file_uri: "",
      file_type: "",
      file_size: 0,
    }));

  // Status histories
  const statusHistoriesArr = statusHistories.map((h) => ({
    id: h.id,
    shopping_refund_request_id: h.shopping_refund_request_id,
    shopping_actor_id: h.shopping_actor_id,
    actor_type: typia.assert<"customer" | "seller" | "admin">(h.actor_type),
    previous_status: h.previous_status,
    new_status: h.new_status,
    timestamp: toISOStringSafe(h.timestamp),
    change_context: h.change_context ?? undefined,
  }));

  // Approvals
  const approvalsArr = approvals.map((a) => ({
    id: a.id,
    shopping_refund_request_id: a.shopping_refund_request_id,
    shopping_refund_status_history_id: a.shopping_refund_status_history_id,
    actor_type: typia.assert<"customer" | "seller" | "admin">(a.actor_type),
    actor_id: a.shopping_actor_id,
    action: a.action,
    note: a.note ?? undefined,
    created_at: toISOStringSafe(a.created_at),
  }));

  // Admin overrides
  const adminOverridesArr = adminOverrides.map((ao) => ({
    id: ao.id,
    shopping_refund_request_id: ao.shopping_refund_request_id,
    shopping_admin_id: ao.shopping_admin_id,
    override_type: ao.override_type,
    reason: ao.reason,
    detailed_context: ao.detailed_context ?? undefined,
    created_at: toISOStringSafe(ao.created_at),
  }));

  return {
    id: updated.id,
    order: orderSummary,
    actor: actorSummary,
    request_type: typia.assert<"refund" | "return" | "cancellation">(
      updated.request_type,
    ),
    business_reason: updated.business_reason,
    request_context: updated.request_context ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    items: itemsArr,
    attachments: topLevelAttachments,
    status_histories: statusHistoriesArr,
    approvals: approvalsArr,
    admin_overrides: adminOverridesArr,
  };
}
