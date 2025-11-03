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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingCustomerRefunds(props: {
  customer: CustomerPayload;
  body: IShoppingRefundRequest.ICreate;
}): Promise<IShoppingRefundRequest> {
  const now = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const order = await tx.shopping_orders.findFirst({
      where: {
        id: props.body.shopping_order_id,
        shopping_customer_id: props.customer.id,
        deleted_at: null,
      },
      include: {
        customer: true,
      },
    });
    if (!order) {
      throw new HttpException("Order not found or not owned by customer", 404);
    }
    const duplicate = await tx.shopping_refund_requests.findFirst({
      where: {
        shopping_order_id: props.body.shopping_order_id,
        actor_type: "customer",
        shopping_actor_id: props.customer.id,
        request_type: props.body.request_type,
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new HttpException(
        "Duplicate refund request for order already exists",
        409,
      );
    }
    const refundRequest = await tx.shopping_refund_requests.create({
      data: {
        id: v4(),
        shopping_order_id: props.body.shopping_order_id,
        shopping_actor_id: props.customer.id,
        actor_type: "customer",
        request_type: props.body.request_type,
        business_reason: props.body.business_reason,
        request_context: props.body.request_context ?? null,
        status: "pending",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const refundItems = await Promise.all(
      props.body.items.map(async (item) => {
        const orderLine = await tx.shopping_order_lines.findFirst({
          where: {
            id: item.shopping_order_line_id,
            shopping_order_id: props.body.shopping_order_id,
            deleted_at: null,
          },
        });
        if (!orderLine) {
          throw new HttpException(
            "Order line not found or not part of order",
            404,
          );
        }
        if (item.quantity > orderLine.quantity || item.quantity < 1) {
          throw new HttpException(
            "Requested refund quantity out of range",
            400,
          );
        }
        const refundItem = await tx.shopping_refund_request_items.create({
          data: {
            id: v4(),
            shopping_refund_request_id: refundRequest.id,
            shopping_order_id: props.body.shopping_order_id,
            shopping_order_line_id: item.shopping_order_line_id,
            quantity: item.quantity,
            item_business_reason: item.item_business_reason ?? null,
            created_at: now,
            updated_at: now,
          },
        });
        let attachments: IShoppingRefundAttachment[] = [];
        if (item.attachments && item.attachments.length > 0) {
          attachments = await Promise.all(
            item.attachments.map(async (attachment) => {
              const refundAttachment =
                await tx.shopping_refund_attachments.create({
                  data: {
                    id: v4(),
                    shopping_refund_request_id: refundRequest.id,
                    shopping_refund_request_item_id: refundItem.id,
                    attachment_file_id: attachment.attachment_file_id,
                    attachment_type: attachment.attachment_type,
                    description: attachment.description ?? null,
                    uploaded_at: now,
                  },
                });
              return {
                id: refundAttachment.id,
                shopping_refund_request_id:
                  refundAttachment.shopping_refund_request_id,
                shopping_refund_request_item_id:
                  refundAttachment.shopping_refund_request_item_id ?? null,
                attachment_file_id: refundAttachment.attachment_file_id,
                attachment_type: refundAttachment.attachment_type,
                description: refundAttachment.description ?? null,
                uploaded_at: toISOStringSafe(refundAttachment.uploaded_at),
                file_uri: attachment.file_uri,
                file_type: attachment.file_type,
                file_size: attachment.file_size,
              };
            }),
          );
        }
        return {
          id: refundItem.id,
          shopping_refund_request_id: refundItem.shopping_refund_request_id,
          shopping_order_id: refundItem.shopping_order_id,
          shopping_order_line_id: refundItem.shopping_order_line_id,
          quantity: refundItem.quantity,
          item_business_reason: refundItem.item_business_reason ?? null,
          created_at: toISOStringSafe(refundItem.created_at),
          updated_at: toISOStringSafe(refundItem.updated_at),
          attachments: attachments.length > 0 ? attachments : undefined,
        };
      }),
    );
    let standaloneAttachments: IShoppingRefundAttachment[] = [];
    if (props.body.attachments && props.body.attachments.length > 0) {
      standaloneAttachments = await Promise.all(
        props.body.attachments.map(async (attachment) => {
          const refundAttachment = await tx.shopping_refund_attachments.create({
            data: {
              id: v4(),
              shopping_refund_request_id: refundRequest.id,
              shopping_refund_request_item_id: null,
              attachment_file_id: attachment.attachment_file_id,
              attachment_type: attachment.attachment_type,
              description: attachment.description ?? null,
              uploaded_at: now,
            },
          });
          return {
            id: refundAttachment.id,
            shopping_refund_request_id:
              refundAttachment.shopping_refund_request_id,
            shopping_refund_request_item_id: null,
            attachment_file_id: refundAttachment.attachment_file_id,
            attachment_type: refundAttachment.attachment_type,
            description: refundAttachment.description ?? null,
            uploaded_at: toISOStringSafe(refundAttachment.uploaded_at),
            file_uri: attachment.file_uri,
            file_type: attachment.file_type,
            file_size: attachment.file_size,
          };
        }),
      );
    }
    const actorSummary = {
      actor_type: typia.assert<"customer" | "seller" | "admin">("customer"),
      id: order.customer.id,
      name: order.customer.name,
    };
    const orderSummary = {
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
    const statusHistoryRecord =
      await tx.shopping_refund_status_histories.create({
        data: {
          id: v4(),
          shopping_refund_request_id: refundRequest.id,
          shopping_actor_id: props.customer.id,
          actor_type: "customer",
          previous_status: "pending",
          new_status: "pending",
          timestamp: now,
          change_context: null,
        },
      });
    return {
      id: refundRequest.id,
      order: orderSummary,
      actor: actorSummary,
      request_type: typia.assert<"refund" | "return" | "cancellation">(
        refundRequest.request_type,
      ),
      business_reason: refundRequest.business_reason,
      request_context: refundRequest.request_context ?? undefined,
      status: refundRequest.status,
      created_at: toISOStringSafe(refundRequest.created_at),
      updated_at: toISOStringSafe(refundRequest.updated_at),
      deleted_at: refundRequest.deleted_at
        ? toISOStringSafe(refundRequest.deleted_at)
        : undefined,
      items: refundItems,
      attachments: standaloneAttachments,
      status_histories: [
        {
          id: statusHistoryRecord.id,
          shopping_refund_request_id:
            statusHistoryRecord.shopping_refund_request_id,
          shopping_actor_id: statusHistoryRecord.shopping_actor_id,
          actor_type: typia.assert<"customer" | "seller" | "admin">("customer"),
          previous_status: statusHistoryRecord.previous_status,
          new_status: statusHistoryRecord.new_status,
          timestamp: toISOStringSafe(statusHistoryRecord.timestamp),
          change_context: statusHistoryRecord.change_context ?? undefined,
        },
      ],
      approvals: [],
      admin_overrides: [],
    };
  });
}
