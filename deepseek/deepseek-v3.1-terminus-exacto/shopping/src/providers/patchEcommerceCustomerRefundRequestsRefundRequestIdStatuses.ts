import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestStatusAtSummaryTransformer } from "../transformers/EcommerceRefundRequestStatusAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerRefundRequestsRefundRequestIdStatuses(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IUpdateStatus;
}): Promise<IPageIEcommerceRefundRequestStatus.ISummary> {
  // Validate refund request exists and belongs to seller
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      include: {
        orderItem: {
          include: {
            seller: true,
            order: true,
          },
        },
      },
    });
  // Check if customer is the seller associated with this refund request
  if (refundRequest.orderItem.seller.id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: You are not the seller associated with this refund request",
      403,
    );
  }
  // Validate refund eligibility: order item must be delivered
  if (refundRequest.orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund request can only be processed for delivered items",
      400,
    );
  }
  // Validate 7-day refund window
  const now = new Date();
  if (now > refundRequest.refund_window_expires_at) {
    throw new HttpException("Refund window has expired", 400);
  }
  // Get current status to validate it's 'pending'
  const currentStatus =
    await MyGlobal.prisma.ecommerce_refund_request_statuses.findFirst({
      where: { ecommerce_refund_request_id: props.refundRequestId },
      orderBy: { created_at: "desc" },
      take: 1,
    });
  if (!currentStatus || currentStatus.status !== "pending") {
    throw new HttpException("Refund request is not in pending status", 400);
  }
  // Validate decision is either 'approved' or 'rejected'
  if (
    props.body.decision !== "approved" &&
    props.body.decision !== "rejected"
  ) {
    throw new HttpException(
      "Decision must be either 'approved' or 'rejected'",
      400,
    );
  }
  // Validate reason is provided
  if (!props.body.reason || props.body.reason.trim().length === 0) {
    throw new HttpException("Reason is required", 400);
  }
  const currentTimestamp = toISOStringSafe(new Date());
  // Create new status record
  const newStatus =
    await MyGlobal.prisma.ecommerce_refund_request_statuses.create({
      data: {
        id: v4(),
        ecommerce_refund_request_id: props.refundRequestId,
        status: props.body.decision,
        reason: props.body.reason,
        created_at: new Date(currentTimestamp),
      },
    });
  // Create audit snapshot
  await MyGlobal.prisma.ecommerce_refund_request_snapshots.create({
    data: {
      id: v4(),
      ecommerce_refund_request_id: props.refundRequestId,
      modifying_seller_id: props.customer.id,
      created_at: new Date(currentTimestamp),
      before_state: JSON.stringify({
        status: currentStatus.status,
        reason: currentStatus.reason,
        timestamp: currentStatus.created_at.toISOString(),
      }),
      after_state: JSON.stringify({
        status: props.body.decision,
        reason: props.body.reason,
        timestamp: currentTimestamp,
      }),
      change_description: `Seller ${props.body.decision} refund request`,
    },
  });
  // Update order item status if approved/rejected
  if (
    props.body.decision === "approved" ||
    props.body.decision === "rejected"
  ) {
    await MyGlobal.prisma.ecommerce_order_items.update({
      where: { id: refundRequest.ecommerce_order_item_id },
      data: {
        status: props.body.decision === "approved" ? "refunded" : "delivered",
      },
    });
    // Trigger inventory restoration for approved refunds
    if (props.body.decision === "approved") {
      await MyGlobal.prisma.ecommerce_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_product_variant_id:
            refundRequest.orderItem.product_variant_id,
          ecommerce_seller_id: props.customer.id,
          ecommerce_order_id: refundRequest.orderItem.order_id,
          quantity: refundRequest.orderItem.quantity,
          reason: "refund_restoration",
          created_at: new Date(currentTimestamp),
          updated_at: new Date(currentTimestamp),
        },
      });
    }
  }
  // Get all status history for this refund request
  const statuses =
    await MyGlobal.prisma.ecommerce_refund_request_statuses.findMany({
      where: { ecommerce_refund_request_id: props.refundRequestId },
      orderBy: { created_at: "desc" },
    });
  // Transform statuses using available transformer
  const transformedStatuses = await ArrayUtil.asyncMap(
    statuses,
    EcommerceRefundRequestStatusAtSummaryTransformer.transform,
  );
  return {
    data: transformedStatuses,
    pagination: {
      current: 1,
      limit: statuses.length,
      records: statuses.length,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
