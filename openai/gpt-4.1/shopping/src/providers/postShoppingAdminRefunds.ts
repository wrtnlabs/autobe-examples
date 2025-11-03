import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequest";
import { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import { IShoppingRefundActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundActor";
import { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminRefunds(props: {
  admin: AdminPayload;
  body: IShoppingRefundRequest.ICreate;
}): Promise<IShoppingRefundRequest> {
  const { admin, body } = props;
  const now = toISOStringSafe(new Date());

  // Validate order exists and is not deleted
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { id: body.shopping_order_id, deleted_at: null },
    select: {
      id: true,
      order_code: true,
      total_price: true,
      status: true,
      created_at: true,
      updated_at: true,
      shopping_customer_id: true,
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
  });
  if (!order) {
    throw new HttpException("Order not found or already deleted", 404);
  }

  // Check for duplicate refund requests on these order lines
  const orderLineIds = body.items.map((item) => item.shopping_order_line_id);
  const hasDuplicateItem =
    await MyGlobal.prisma.shopping_refund_request_items.findFirst({
      where: {
        shopping_order_line_id: { in: orderLineIds },
        refundRequest: {
          shopping_order_id: body.shopping_order_id,
          deleted_at: null,
        },
      },
    });
  if (hasDuplicateItem) {
    throw new HttpException("Duplicate refund request for order line(s)", 409);
  }

  const refundRequestId = v4();

  await MyGlobal.prisma.shopping_refund_requests.create({
    data: {
      id: refundRequestId,
      shopping_order_id: body.shopping_order_id,
      shopping_actor_id: admin.id,
      actor_type: "admin",
      request_type: body.request_type,
      business_reason: body.business_reason,
      request_context: body.request_context ?? null,
      status: "pending",
      created_at: now,
      updated_at: now,
    },
  });

  // Items and their attachments
  const itemResults = await Promise.all(
    body.items.map(async (item) => {
      const itemId = v4();
      await MyGlobal.prisma.shopping_refund_request_items.create({
        data: {
          id: itemId,
          shopping_refund_request_id: refundRequestId,
          shopping_order_id: order.id,
          shopping_order_line_id: item.shopping_order_line_id,
          quantity: item.quantity,
          item_business_reason: item.item_business_reason ?? null,
          created_at: now,
          updated_at: now,
        },
      });
      const attachments = item.attachments
        ? await Promise.all(
            item.attachments.map(async (att) => {
              const attId = v4();
              await MyGlobal.prisma.shopping_refund_attachments.create({
                data: {
                  id: attId,
                  shopping_refund_request_id: refundRequestId,
                  shopping_refund_request_item_id: itemId,
                  attachment_file_id: att.attachment_file_id,
                  attachment_type: att.attachment_type,
                  description: att.description ?? null,
                  uploaded_at: now,
                  // file_size: att.file_size, // REMOVED - DOES NOT EXIST IN SCHEMA
                },
              });
              return {
                id: attId,
                shopping_refund_request_id: refundRequestId,
                shopping_refund_request_item_id: itemId,
                attachment_file_id: att.attachment_file_id,
                attachment_type: att.attachment_type,
                description: att.description ?? null,
                uploaded_at: now,
                file_uri: att.file_uri,
                file_type: att.file_type,
                file_size: att.file_size,
              };
            }),
          )
        : [];
      return {
        id: itemId,
        shopping_refund_request_id: refundRequestId,
        shopping_order_id: order.id,
        shopping_order_line_id: item.shopping_order_line_id,
        quantity: item.quantity,
        item_business_reason: item.item_business_reason ?? null,
        created_at: now,
        updated_at: now,
        attachments,
      };
    }),
  );

  // Request-level attachments
  const reqAttachments = body.attachments
    ? await Promise.all(
        body.attachments.map(async (att) => {
          const attId = v4();
          await MyGlobal.prisma.shopping_refund_attachments.create({
            data: {
              id: attId,
              shopping_refund_request_id: refundRequestId,
              shopping_refund_request_item_id: null,
              attachment_file_id: att.attachment_file_id,
              attachment_type: att.attachment_type,
              description: att.description ?? null,
              uploaded_at: now,
              // file_size: att.file_size, // REMOVED - DOES NOT EXIST IN SCHEMA
            },
          });
          return {
            id: attId,
            shopping_refund_request_id: refundRequestId,
            shopping_refund_request_item_id: null,
            attachment_file_id: att.attachment_file_id,
            attachment_type: att.attachment_type,
            description: att.description ?? null,
            uploaded_at: now,
            file_uri: att.file_uri,
            file_type: att.file_type,
            file_size: att.file_size,
          };
        }),
      )
    : [];

  // Initial status history
  const statusHistId = v4();
  await MyGlobal.prisma.shopping_refund_status_histories.create({
    data: {
      id: statusHistId,
      shopping_refund_request_id: refundRequestId,
      shopping_actor_id: admin.id,
      actor_type: "admin",
      previous_status: "none",
      new_status: "pending",
      timestamp: now,
      change_context: undefined,
    },
  });

  // Actor info
  const adminRecord = await MyGlobal.prisma.shopping_admins.findUnique({
    where: { id: admin.id },
    select: { name: true },
  });
  const actor = {
    actor_type: typia.assert<"customer" | "seller" | "admin">("admin"),
    id: admin.id,
    name: adminRecord?.name ?? "",
  };

  // Compose order summary
  const c = order.customer;
  const orderSummary = {
    id: order.id,
    order_code: order.order_code,
    total_price: order.total_price,
    status: order.status,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    customer: {
      id: c.id,
      name: c.name,
      email: c.email,
      is_active: c.is_active,
      created_at: toISOStringSafe(c.created_at),
      deleted_at: c.deleted_at ? toISOStringSafe(c.deleted_at) : null,
    },
  };

  return {
    id: refundRequestId,
    order: orderSummary,
    actor,
    request_type: body.request_type,
    business_reason: body.business_reason,
    request_context: body.request_context ?? null,
    status: "pending",
    created_at: now,
    updated_at: now,
    deleted_at: null,
    items: itemResults,
    attachments: reqAttachments,
    status_histories: [
      {
        id: statusHistId,
        shopping_refund_request_id: refundRequestId,
        shopping_actor_id: admin.id,
        actor_type: typia.assert<"customer" | "seller" | "admin">("admin"),
        previous_status: "none",
        new_status: "pending",
        timestamp: now,
        change_context: undefined,
      },
    ],
    approvals: [],
    admin_overrides: [],
  };
}
