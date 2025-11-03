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

export async function getShoppingAdminRefundsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingRefundRequest> {
  const refund = await MyGlobal.prisma.shopping_refund_requests.findFirst({
    where: { id: props.refundRequestId, deleted_at: null },
    include: {
      order: { include: { customer: true } },
    },
  });
  if (!refund) throw new HttpException("Refund request not found", 404);

  const [
    items,
    dbAttachments,
    dbAttachmentMetas,
    statusHistories,
    approvals,
    adminOverrides,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_refund_request_items.findMany({
      where: { shopping_refund_request_id: refund.id },
      orderBy: { created_at: "asc" },
    }),
    MyGlobal.prisma.shopping_refund_attachments.findMany({
      where: { shopping_refund_request_id: refund.id },
      orderBy: { uploaded_at: "asc" },
    }),
    MyGlobal.prisma.shopping_product_images.findMany({
      where: {
        id: {
          in: (
            await MyGlobal.prisma.shopping_refund_attachments.findMany({
              where: { shopping_refund_request_id: refund.id },
              select: { attachment_file_id: true },
            })
          ).map((a) => a.attachment_file_id),
        },
      },
    }),
    MyGlobal.prisma.shopping_refund_status_histories.findMany({
      where: { shopping_refund_request_id: refund.id },
      orderBy: { timestamp: "asc" },
    }),
    MyGlobal.prisma.shopping_refund_approvals.findMany({
      where: { shopping_refund_request_id: refund.id },
      orderBy: { created_at: "asc" },
    }),
    MyGlobal.prisma.shopping_refund_admin_overrides.findMany({
      where: { shopping_refund_request_id: refund.id },
      orderBy: { created_at: "asc" },
    }),
  ]);

  // Map meta file info for attachments
  const imageMap = new Map(dbAttachmentMetas.map((img) => [img.id, img]));
  const resolveAttachmentMeta = (a: any) => {
    const meta = imageMap.get(a.attachment_file_id);
    return {
      id: a.id,
      shopping_refund_request_id: a.shopping_refund_request_id,
      shopping_refund_request_item_id:
        a.shopping_refund_request_item_id ?? undefined,
      attachment_file_id: a.attachment_file_id,
      attachment_type: a.attachment_type,
      description: a.description ?? undefined,
      uploaded_at: toISOStringSafe(a.uploaded_at),
      file_uri: meta ? meta.image_uri : "",
      file_type: meta ? "image/jpeg" : "image/jpeg",
      file_size: 0,
    } satisfies IShoppingRefundAttachment;
  };

  // Attachments per item
  const attachmentsByItem = new Map<string, IShoppingRefundAttachment[]>();
  const allAttachments = dbAttachments.map(resolveAttachmentMeta);
  for (const att of allAttachments) {
    const key = att.shopping_refund_request_item_id ?? "";
    if (!attachmentsByItem.has(key)) attachmentsByItem.set(key, []);
    attachmentsByItem.get(key)!.push(att);
  }

  // Actor summary with type guard
  let actor: IShoppingRefundActor.ISummary;
  if (refund.actor_type === "customer") {
    const customer = await MyGlobal.prisma.shopping_customers.findUnique({
      where: { id: refund.shopping_actor_id },
    });
    if (!customer)
      throw new HttpException("Refund actor (customer) not found", 404);
    actor = { actor_type: "customer", id: customer.id, name: customer.name };
  } else if (refund.actor_type === "seller") {
    const seller = await MyGlobal.prisma.shopping_sellers.findUnique({
      where: { id: refund.shopping_actor_id },
    });
    if (!seller)
      throw new HttpException("Refund actor (seller) not found", 404);
    actor = { actor_type: "seller", id: seller.id, name: seller.display_name };
  } else {
    const admin = await MyGlobal.prisma.shopping_admins.findUnique({
      where: { id: refund.shopping_actor_id },
    });
    if (!admin) throw new HttpException("Refund actor (admin) not found", 404);
    actor = { actor_type: "admin", id: admin.id, name: admin.name };
  }

  const orderCustomer = refund.order?.customer;
  if (!orderCustomer)
    throw new HttpException("Order's customer info missing", 500);

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
        id: orderCustomer.id,
        name: orderCustomer.name,
        email: orderCustomer.email,
        is_active: orderCustomer.is_active,
        created_at: toISOStringSafe(orderCustomer.created_at),
        deleted_at:
          orderCustomer.deleted_at !== null
            ? toISOStringSafe(orderCustomer.deleted_at)
            : null,
      },
    },
    actor,
    request_type: (["refund", "return", "cancellation"] as const).includes(
      refund.request_type as any,
    )
      ? (refund.request_type as "refund" | "return" | "cancellation")
      : "refund",
    business_reason: refund.business_reason,
    request_context: refund.request_context ?? undefined,
    status: refund.status,
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
    deleted_at:
      refund.deleted_at !== null
        ? toISOStringSafe(refund.deleted_at)
        : undefined,
    items: items.map(
      (item): IShoppingRefundRequestItem => ({
        id: item.id,
        shopping_refund_request_id: item.shopping_refund_request_id,
        shopping_order_id: item.shopping_order_id,
        shopping_order_line_id: item.shopping_order_line_id,
        quantity: item.quantity,
        item_business_reason: item.item_business_reason ?? undefined,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        attachments: attachmentsByItem.get(item.id) ?? [],
      }),
    ),
    attachments: allAttachments,
    status_histories: statusHistories.map(
      (st): IShoppingRefundStatusHistory => ({
        id: st.id,
        shopping_refund_request_id: st.shopping_refund_request_id,
        shopping_actor_id: st.shopping_actor_id,
        actor_type: st.actor_type as "customer" | "seller" | "admin",
        previous_status: st.previous_status,
        new_status: st.new_status,
        timestamp: toISOStringSafe(st.timestamp),
        change_context: st.change_context ?? undefined,
      }),
    ),
    approvals: approvals.map(
      (app): IShoppingRefundApproval => ({
        id: app.id,
        shopping_refund_request_id: app.shopping_refund_request_id,
        shopping_refund_status_history_id:
          app.shopping_refund_status_history_id,
        actor_type: app.actor_type,
        actor_id: app.shopping_actor_id,
        action: app.action,
        note: app.note ?? undefined,
        created_at: toISOStringSafe(app.created_at),
      }),
    ),
    admin_overrides: adminOverrides.map(
      (adm): IShoppingRefundAdminOverride => ({
        id: adm.id,
        shopping_refund_request_id: adm.shopping_refund_request_id,
        shopping_admin_id: adm.shopping_admin_id,
        override_type: adm.override_type,
        reason: adm.reason,
        detailed_context: adm.detailed_context ?? undefined,
        created_at: toISOStringSafe(adm.created_at),
      }),
    ),
  };
}
