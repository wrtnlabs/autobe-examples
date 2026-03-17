import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestsRefundRequestIdActionsRespond(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IRespond;
}): Promise<IEcommerceMallRefundRequest> {
  // Verify seller owns the refund request with full order item details
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        seller_id: true,
        status: true,
        order_item_id: true,
        reason: true,
        orderItem: {
          select: {
            id: true,
            status: true,
            variant_id: true,
            quantity: true,
          },
        },
      },
    });
  // Authorization: seller must own the refund request per section 397
  if (refundRequest.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Status validation: must be pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("Conflict", 409);
  }
  // Order item validation: must be delivered
  if (refundRequest.orderItem.status !== "delivered") {
    throw new HttpException("Conflict", 409);
  }
  // Execute transaction with all updates
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    // Update refund request status and responded_at
    await tx.ecommerce_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: props.body.status,
        responded_at: now,
        updated_at: now,
      },
    });
    // Create snapshot preserving the state at response time
    await tx.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        refund_request_id: props.refundRequestId,
        reason: refundRequest.reason,
        status: props.body.status,
        response_reason: props.body.responseReason ?? null,
        created_at: now,
      },
    });
    // If approved, update order item and restore inventory
    if (props.body.status === "approved") {
      // Update order item status to refunded
      await tx.ecommerce_mall_order_items.update({
        where: { id: refundRequest.orderItem.id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // Create inventory record to restore stock
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          product_variant_id: refundRequest.orderItem.variant_id,
          quantity_change: refundRequest.orderItem.quantity,
          reason: "refund_processed",
          created_at: now,
        },
      });
    }
  });
  // Return full refund request entity using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  return await EcommerceMallRefundRequestTransformer.transform(updated);
}
