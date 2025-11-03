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

export async function putShoppingSellerRefundsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingRefundRequest.IUpdate;
}): Promise<IShoppingRefundRequest> {
  const refund = await MyGlobal.prisma.shopping_refund_requests.findUnique({
    where: { id: props.refundRequestId },
  });
  if (
    !refund ||
    (refund.deleted_at !== null && refund.deleted_at !== undefined)
  ) {
    throw new HttpException("Refund request not found.", 404);
  }
  if (
    !(
      refund.actor_type === "seller" &&
      refund.shopping_actor_id === props.seller.id
    )
  ) {
    throw new HttpException(
      "You are not authorized to update this refund request.",
      403,
    );
  }
  if (refund.status === "completed") {
    throw new HttpException("Cannot update a completed refund request.", 400);
  }
  const updateData = {
    business_reason:
      props.body.business_reason !== undefined
        ? props.body.business_reason
        : undefined,
    request_context:
      props.body.request_context !== undefined
        ? props.body.request_context
        : undefined,
    status: props.body.status !== undefined ? props.body.status : undefined,
    updated_at: toISOStringSafe(new Date()),
  };
  const updated = await MyGlobal.prisma.shopping_refund_requests.update({
    where: { id: props.refundRequestId },
    data: updateData,
  });
  const [
    order,
    actorSeller,
    items,
    attachments,
    status_histories,
    approvals,
    admin_overrides,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_orders.findUniqueOrThrow({
      where: { id: updated.shopping_order_id },
      include: { customer: true },
    }),
    MyGlobal.prisma.shopping_sellers.findUnique({
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
  return {
    id: updated.id,
    order: {
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
        deleted_at:
          order.customer.deleted_at !== undefined &&
          order.customer.deleted_at !== null
            ? toISOStringSafe(order.customer.deleted_at)
            : null,
      },
    },
    actor: {
      actor_type: typia.assert<"seller">("seller"),
      id: updated.shopping_actor_id,
      name:
        actorSeller && actorSeller.display_name ? actorSeller.display_name : "",
    },
    request_type: typia.assert<"refund" | "return" | "cancellation">(
      updated.request_type,
    ),
    business_reason: updated.business_reason,
    request_context:
      updated.request_context !== undefined ? updated.request_context : null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    items: items.map((item) => ({
      id: item.id,
      shopping_refund_request_id: item.shopping_refund_request_id,
      shopping_order_id: item.shopping_order_id,
      shopping_order_line_id: item.shopping_order_line_id,
      quantity: item.quantity,
      item_business_reason:
        item.item_business_reason !== undefined
          ? item.item_business_reason
          : undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      attachments: attachments
        .filter((att) => att.shopping_refund_request_item_id === item.id)
        .map((att) => ({
          id: att.id,
          shopping_refund_request_id: att.shopping_refund_request_id,
          shopping_refund_request_item_id:
            att.shopping_refund_request_item_id !== undefined
              ? att.shopping_refund_request_item_id
              : undefined,
          attachment_file_id: att.attachment_file_id,
          attachment_type: att.attachment_type,
          description:
            att.description !== undefined ? att.description : undefined,
          uploaded_at: toISOStringSafe(att.uploaded_at),
          file_uri:
            (att as any).file_uri !== undefined
              ? (att as any).file_uri
              : undefined,
          file_type:
            (att as any).file_type !== undefined
              ? (att as any).file_type
              : undefined,
          file_size:
            (att as any).file_size !== undefined
              ? (att as any).file_size
              : undefined,
        })),
    })),
    attachments: attachments
      .filter(
        (att) =>
          att.shopping_refund_request_item_id === null ||
          att.shopping_refund_request_item_id === undefined,
      )
      .map((att) => ({
        id: att.id,
        shopping_refund_request_id: att.shopping_refund_request_id,
        shopping_refund_request_item_id:
          att.shopping_refund_request_item_id !== undefined
            ? att.shopping_refund_request_item_id
            : undefined,
        attachment_file_id: att.attachment_file_id,
        attachment_type: att.attachment_type,
        description:
          att.description !== undefined ? att.description : undefined,
        uploaded_at: toISOStringSafe(att.uploaded_at),
        file_uri:
          (att as any).file_uri !== undefined
            ? (att as any).file_uri
            : undefined,
        file_type:
          (att as any).file_type !== undefined
            ? (att as any).file_type
            : undefined,
        file_size:
          (att as any).file_size !== undefined
            ? (att as any).file_size
            : undefined,
      })),
    status_histories: status_histories.map((sth) => ({
      id: sth.id,
      shopping_refund_request_id: sth.shopping_refund_request_id,
      shopping_actor_id: sth.shopping_actor_id,
      actor_type: typia.assert<"customer" | "seller" | "admin">(sth.actor_type),
      previous_status: sth.previous_status,
      new_status: sth.new_status,
      timestamp: toISOStringSafe(sth.timestamp),
      change_context:
        sth.change_context !== null && sth.change_context !== undefined
          ? sth.change_context
          : undefined,
    })),
    approvals: approvals.map((app) => ({
      id: app.id,
      shopping_refund_request_id: app.shopping_refund_request_id,
      shopping_refund_status_history_id: app.shopping_refund_status_history_id,
      actor_type: typia.assert<"customer" | "seller" | "admin">(app.actor_type),
      actor_id: app.shopping_actor_id,
      action: app.action,
      note: app.note !== undefined && app.note !== null ? app.note : undefined,
      created_at: toISOStringSafe(app.created_at),
    })),
    admin_overrides: admin_overrides.map((ao) => ({
      id: ao.id,
      shopping_refund_request_id: ao.shopping_refund_request_id,
      shopping_admin_id: ao.shopping_admin_id,
      override_type: ao.override_type,
      reason: ao.reason,
      detailed_context:
        ao.detailed_context !== undefined && ao.detailed_context !== null
          ? ao.detailed_context
          : undefined,
      created_at: toISOStringSafe(ao.created_at),
    })),
  };
}
