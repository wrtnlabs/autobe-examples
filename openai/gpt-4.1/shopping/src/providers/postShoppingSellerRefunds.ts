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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingSellerRefunds(props: {
  seller: SellerPayload;
  body: IShoppingRefundRequest.ICreate;
}): Promise<IShoppingRefundRequest> {
  const { seller, body } = props;
  // Get order info
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: { id: body.shopping_order_id, deleted_at: null },
    include: { customer: true },
  });
  if (!order) throw new HttpException("Order not found", 404);
  // Get all order lines for this order belonging to seller
  const sellerOrderLines = await MyGlobal.prisma.shopping_order_lines.findMany({
    where: {
      shopping_order_id: body.shopping_order_id,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
  });
  const validOrderLineIds = new Set(sellerOrderLines.map((l) => l.id));
  // Validate every item in body.items is for a line belonging to this seller
  for (const item of body.items) {
    if (!validOrderLineIds.has(item.shopping_order_line_id)) {
      throw new HttpException(
        "Refund request item does not belong to seller's order lines",
        400,
      );
    }
    // Check if duplicate refund request already exists for this order line
    const dup = await MyGlobal.prisma.shopping_refund_request_items.findFirst({
      where: {
        shopping_order_line_id: item.shopping_order_line_id,
        refundRequest: { order: { id: body.shopping_order_id } },
      },
    });
    if (dup) {
      throw new HttpException(
        "A refund request for this order line already exists",
        409,
      );
    }
  }
  const now = toISOStringSafe(new Date());
  const refundRequestId = v4();
  // Create refund request
  const createdRefund = await MyGlobal.prisma.shopping_refund_requests.create({
    data: {
      id: refundRequestId,
      shopping_order_id: body.shopping_order_id,
      shopping_actor_id: seller.id,
      actor_type: "seller",
      request_type: body.request_type,
      business_reason: body.business_reason,
      request_context: body.request_context ?? null,
      status: "pending",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create all refund request items
  const refundRequestItemsResults = await Promise.all(
    body.items.map(async (item) => {
      const itemId = v4();
      const createdItem =
        await MyGlobal.prisma.shopping_refund_request_items.create({
          data: {
            id: itemId,
            shopping_refund_request_id: refundRequestId,
            shopping_order_id: body.shopping_order_id,
            shopping_order_line_id: item.shopping_order_line_id,
            quantity: item.quantity,
            item_business_reason: item.item_business_reason ?? null,
            created_at: now,
            updated_at: now,
          },
        });
      return { ...createdItem, attachments: [] };
    }),
  );
  // Prepare all attachments list (attachments for request & those for each item)
  const allAttachments: Array<IShoppingRefundAttachment> = [];
  // Attachments for request (no shopping_refund_request_item_id)
  if (body.attachments && body.attachments.length) {
    for (const att of body.attachments) {
      const attId = v4();
      const newAtt = await MyGlobal.prisma.shopping_refund_attachments.create({
        data: {
          id: attId,
          shopping_refund_request_id: refundRequestId,
          shopping_refund_request_item_id: null,
          attachment_file_id: att.attachment_file_id,
          attachment_type: att.attachment_type,
          description: att.description ?? null,
          uploaded_at: now,
        },
      });
      allAttachments.push({
        ...newAtt,
        shopping_refund_request_item_id: null,
        file_uri: att.file_uri,
        file_type: att.file_type,
        file_size: att.file_size,
        uploaded_at: toISOStringSafe(newAtt.uploaded_at),
      });
    }
  }
  // Attachments per item
  for (let idx = 0; idx < body.items.length; ++idx) {
    const item = body.items[idx];
    const itemId = refundRequestItemsResults[idx].id;
    if (item.attachments && item.attachments.length) {
      for (const att of item.attachments) {
        const attId = v4();
        const newAtt = await MyGlobal.prisma.shopping_refund_attachments.create(
          {
            data: {
              id: attId,
              shopping_refund_request_id: refundRequestId,
              shopping_refund_request_item_id: itemId,
              attachment_file_id: att.attachment_file_id,
              attachment_type: att.attachment_type,
              description: att.description ?? null,
              uploaded_at: now,
            },
          },
        );
        allAttachments.push({
          ...newAtt,
          file_uri: att.file_uri,
          file_type: att.file_type,
          file_size: att.file_size,
          uploaded_at: toISOStringSafe(newAtt.uploaded_at),
        });
      }
    }
  }
  // Create status history
  const statusHistoryId = v4();
  const statusHistory =
    await MyGlobal.prisma.shopping_refund_status_histories.create({
      data: {
        id: statusHistoryId,
        shopping_refund_request_id: refundRequestId,
        shopping_actor_id: seller.id,
        actor_type: "seller",
        previous_status: "pending",
        new_status: "pending",
        timestamp: now,
        change_context: "Request created",
      },
    });
  // Build DTO
  const IShoppingOrderSummary: IShoppingOrder.ISummary = {
    id: order.id,
    order_code: order.order_code,
    total_price: order.total_price,
    status: order.status,
    created_at: order.created_at ? toISOStringSafe(order.created_at) : now,
    updated_at: order.updated_at ? toISOStringSafe(order.updated_at) : now,
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      email: order.customer.email,
      is_active: order.customer.is_active,
      created_at: order.customer.created_at
        ? toISOStringSafe(order.customer.created_at)
        : now,
      deleted_at: order.customer.deleted_at
        ? toISOStringSafe(order.customer.deleted_at)
        : null,
    },
  };
  const IShoppingRefundActorSummary: IShoppingRefundActor.ISummary = {
    actor_type: "seller",
    id: seller.id,
    name: (await MyGlobal.prisma.shopping_sellers.findFirst({
      where: { id: seller.id },
    }))!.display_name,
  };
  const items: IShoppingRefundRequestItem[] = await Promise.all(
    refundRequestItemsResults.map(async (item) => {
      const attachments = allAttachments.filter(
        (a) => a.shopping_refund_request_item_id === item.id,
      );
      return {
        id: item.id,
        shopping_refund_request_id: item.shopping_refund_request_id,
        shopping_order_id: item.shopping_order_id,
        shopping_order_line_id: item.shopping_order_line_id,
        quantity: item.quantity,
        item_business_reason: item.item_business_reason ?? undefined,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        attachments: attachments.length ? attachments : undefined,
      };
    }),
  );
  const status_histories: IShoppingRefundStatusHistory[] = [
    {
      id: statusHistory.id,
      shopping_refund_request_id: refundRequestId,
      shopping_actor_id: seller.id,
      actor_type: "seller",
      previous_status: "pending",
      new_status: "pending",
      timestamp: now,
      change_context: "Request created",
    },
  ];
  return {
    id: refundRequestId,
    order: IShoppingOrderSummary,
    actor: IShoppingRefundActorSummary,
    request_type: body.request_type,
    business_reason: body.business_reason,
    request_context: body.request_context ?? undefined,
    status: "pending",
    created_at: now,
    updated_at: now,
    deleted_at: null,
    items,
    attachments: allAttachments.filter(
      (a) => a.shopping_refund_request_item_id == null,
    ),
    status_histories,
    approvals: [],
    admin_overrides: [],
  };
}
