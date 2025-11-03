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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminRefundsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundRequest.IUpdate;
}): Promise<IShoppingRefundRequest> {
  // 1. Check refund request exists and is not soft-deleted
  const dbRequest = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
  });
  if (!dbRequest || dbRequest.deleted_at !== null) {
    throw new HttpException("Refund request not found", 404);
  }
  // 2. Update refund request (patch only supplied fields, force updated_at)
  const updated = await MyGlobal.prisma.shopping_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      ...(props.body.business_reason !== undefined
        ? { business_reason: props.body.business_reason }
        : {}),
      ...(props.body.status !== undefined ? { status: props.body.status } : {}),
      ...(props.body.request_context !== undefined
        ? { request_context: props.body.request_context }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 3. Fetch related order (with customer info)
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { id: updated.shopping_order_id },
    include: { customer: true },
  });
  if (!order || !order.customer) {
    throw new HttpException("Associated order or customer not found", 500);
  }
  // 4. Fetch actor (customer); only supporting customer for now
  const actorCustomer = await MyGlobal.prisma.shopping_customers.findUnique({
    where: { id: updated.shopping_actor_id },
  });
  if (!actorCustomer) {
    throw new HttpException("Associated refund actor not found", 500);
  }
  // 5. Fetch items
  const itemsRaw = await MyGlobal.prisma.shopping_refund_request_items.findMany(
    {
      where: { shopping_refund_request_id: props.refundRequestId },
    },
  );
  const items: IShoppingRefundRequestItem[] = itemsRaw.map((item) => ({
    id: item.id,
    shopping_refund_request_id: item.shopping_refund_request_id,
    shopping_order_id: item.shopping_order_id,
    shopping_order_line_id: item.shopping_order_line_id,
    quantity: item.quantity,
    item_business_reason: item.item_business_reason ?? undefined,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    attachments: undefined,
  }));
  // 6. Fetch attachments; set file_uri/type/size to safe defaults (should be from storage system)
  const attachmentsRaw =
    await MyGlobal.prisma.shopping_refund_attachments.findMany({
      where: { shopping_refund_request_id: props.refundRequestId },
    });
  const attachments: IShoppingRefundAttachment[] = attachmentsRaw.map(
    (att) => ({
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
    }),
  );
  // 7. Fetch status histories
  const historiesRaw =
    await MyGlobal.prisma.shopping_refund_status_histories.findMany({
      where: { shopping_refund_request_id: props.refundRequestId },
    });
  const status_histories: IShoppingRefundStatusHistory[] = historiesRaw.map(
    (hist) => ({
      id: hist.id,
      shopping_refund_request_id: hist.shopping_refund_request_id,
      shopping_actor_id: hist.shopping_actor_id,
      actor_type: typia.assert<"customer" | "seller" | "admin">(
        hist.actor_type,
      ),
      previous_status: hist.previous_status,
      new_status: hist.new_status,
      timestamp: toISOStringSafe(hist.timestamp),
      change_context: hist.change_context ?? undefined,
    }),
  );
  // 8. Fetch approvals
  const approvalsRaw = await MyGlobal.prisma.shopping_refund_approvals.findMany(
    {
      where: { shopping_refund_request_id: props.refundRequestId },
    },
  );
  const approvals: IShoppingRefundApproval[] = approvalsRaw.map((appr) => ({
    id: appr.id,
    shopping_refund_request_id: appr.shopping_refund_request_id,
    shopping_refund_status_history_id: appr.shopping_refund_status_history_id,
    actor_type: appr.actor_type,
    actor_id: appr.shopping_actor_id, // <-- fixed: use shopping_actor_id
    action: appr.action,
    note: appr.note ?? undefined,
    created_at: toISOStringSafe(appr.created_at),
  }));
  // 9. Fetch admin overrides
  const overridesRaw =
    await MyGlobal.prisma.shopping_refund_admin_overrides.findMany({
      where: { shopping_refund_request_id: props.refundRequestId },
    });
  const admin_overrides: IShoppingRefundAdminOverride[] = overridesRaw.map(
    (ovr) => ({
      id: ovr.id,
      shopping_refund_request_id: ovr.shopping_refund_request_id,
      shopping_admin_id: ovr.shopping_admin_id,
      override_type: ovr.override_type,
      reason: ovr.reason,
      detailed_context: ovr.detailed_context ?? undefined,
      created_at: toISOStringSafe(ovr.created_at),
    }),
  );
  // 10. Build ISummary order
  const orderSummary: IShoppingOrder.ISummary = {
    id: order.id,
    order_code: order.order_code,
    total_price: order.total_price,
    status: order.status,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      email: order.customer.email,
      is_active: order.customer.is_active,
      created_at: toISOStringSafe(order.customer.created_at),
      deleted_at: order.customer.deleted_at
        ? toISOStringSafe(order.customer.deleted_at)
        : null,
    },
  };
  // 11. Build refund actor summary (currently supports only customer type)
  const actor: IShoppingRefundActor.ISummary = {
    actor_type: "customer",
    id: actorCustomer.id,
    name: actorCustomer.name,
  };
  return {
    id: updated.id,
    order: orderSummary,
    actor,
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
    items,
    attachments,
    status_histories,
    approvals,
    admin_overrides,
  };
}
