import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrdersOrderIdCancel(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.ICancelRequest;
}): Promise<IShoppingMallOrder.ICancelResponse> {
  const { customer, orderId, body } = props;

  // Fetch order and verify ownership
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Authorization check: verify customer owns the order
  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only cancel your own orders",
      403,
    );
  }

  // Validate order status allows cancellation
  const uncancellableStatuses = [
    "shipped",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled",
    "refunded",
  ];

  if (uncancellableStatuses.includes(order.status)) {
    throw new HttpException(
      "Order cannot be cancelled in current status. Please use refund request for delivered orders.",
      400,
    );
  }

  // Check if cancellation already exists
  const existingCancellation =
    await MyGlobal.prisma.shopping_mall_cancellations.findUnique({
      where: { shopping_mall_order_id: orderId },
    });

  if (existingCancellation) {
    throw new HttpException(
      "Cancellation request already exists for this order",
      409,
    );
  }

  // Determine if immediate approval or requires seller approval
  const immediateApprovalStatuses = [
    "pending_payment",
    "payment_confirmed",
    "awaiting_seller_confirmation",
  ];

  const requiresApproval = !immediateApprovalStatuses.includes(order.status);
  const now = toISOStringSafe(new Date());
  const cancellationStatus = requiresApproval ? "pending_approval" : "approved";

  // Calculate seller response deadline (24 hours from now) if approval required
  const sellerResponseDeadline = requiresApproval
    ? toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000))
    : undefined;

  // Create cancellation record
  const cancellationId = v4() as string & tags.Format<"uuid">;

  const cancellation = await MyGlobal.prisma.shopping_mall_cancellations.create(
    {
      data: {
        id: cancellationId,
        shopping_mall_order_id: orderId,
        requester_customer_id: customer.id,
        cancellation_reason: body.cancellation_reason,
        cancellation_status: cancellationStatus,
        refund_amount: order.total_amount,
        refund_processed: false,
        requested_at: now,
        created_at: now,
        updated_at: now,
      },
    },
  );

  // If immediate cancellation, update order and process refund/inventory
  if (!requiresApproval) {
    // Update order status to cancelled
    await MyGlobal.prisma.shopping_mall_orders.update({
      where: { id: orderId },
      data: {
        status: "cancelled",
        cancelled_at: now,
        updated_at: now,
      },
    });

    // Fetch order items to restore inventory
    const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
      {
        where: { shopping_mall_order_id: orderId },
      },
    );

    // Restore inventory for each order item
    for (const item of orderItems) {
      // Fetch current SKU state
      const sku = await MyGlobal.prisma.shopping_mall_skus.findUniqueOrThrow({
        where: { id: item.shopping_mall_sku_id },
      });

      const newQuantity = sku.available_quantity + item.quantity;

      // Update SKU inventory
      await MyGlobal.prisma.shopping_mall_skus.update({
        where: { id: item.shopping_mall_sku_id },
        data: {
          available_quantity: newQuantity,
        },
      });

      // Create inventory transaction record
      await MyGlobal.prisma.shopping_mall_inventory_transactions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_sku_id: item.shopping_mall_sku_id,
          shopping_mall_order_id: orderId,
          transaction_type: "cancellation",
          quantity_change: item.quantity,
          quantity_after: newQuantity,
          transaction_status: "completed",
          reason: `Order cancelled: ${body.cancellation_reason}`,
          created_at: now,
        },
      });
    }

    // Fetch payment transaction for refund processing
    const paymentTransaction =
      await MyGlobal.prisma.shopping_mall_payment_transactions.findFirst({
        where: {
          shopping_mall_customer_id: customer.id,
          status: "captured",
        },
        orderBy: {
          created_at: "desc",
        },
      });

    if (paymentTransaction) {
      // Create refund record linked to actual payment transaction
      await MyGlobal.prisma.shopping_mall_refunds.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_payment_transaction_id: paymentTransaction.id,
          shopping_mall_order_id: orderId,
          initiated_by_customer_id: customer.id,
          refund_amount: order.total_amount,
          refund_reason: "order_cancellation",
          gateway_refund_id: `REFUND-${v4()}`,
          status: "pending",
          initiated_by_type: "customer",
          created_at: now,
          updated_at: now,
        },
      });
    }
  }

  // Construct and return response
  return {
    cancellation_id: cancellation.id,
    order_id: order.id,
    order_number: order.order_number,
    cancellation_status: cancellation.cancellation_status,
    refund_amount: cancellation.refund_amount,
    refund_processed: cancellation.refund_processed,
    expected_refund_timeline: requiresApproval
      ? undefined
      : "5-10 business days for credit/debit cards",
    message: requiresApproval
      ? "Your cancellation request has been submitted to the seller for approval. You will be notified of their decision within 24 hours."
      : "Your order has been cancelled successfully. You will receive a full refund within 5-10 business days.",
    requested_at: toISOStringSafe(cancellation.requested_at),
    seller_response_deadline: sellerResponseDeadline,
  };
}
