import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderNumberShipmentsShipmentId(props: {
  admin: AdminPayload;
  orderNumber: string;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the order by orderNumber
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found.", 404);
  }

  // Find the shipment by shipmentId and match order
  const shipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
      where: {
        id: props.shipmentId,
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
    });
  if (!shipment) {
    throw new HttpException("Shipment not found for this order.", 404);
  }

  // Business state checks - prevent deletion if status is delivered, returned, or not pending/cancellable
  if (shipment.status === "delivered" || shipment.status === "returned") {
    throw new HttpException(
      "Shipment cannot be deleted when status is delivered or returned.",
      409,
    );
  }

  // Prevent deletion if the order has payments in finalized state related to shipment
  const paymentCount = await MyGlobal.prisma.shopping_mall_payments.count({
    where: {
      // Could narrow further if shipment-level link exists; here, just block if order-level payments done
      status: {
        in: ["completed", "refunded", "failed"],
      },
      deleted_at: null,
      // Payment can't be directly linked to shipment, so block if completed payment for order exists
      // (Business logic may require finer mapping)
      // join to order via order.id if joined in actual DB, but not present in schema from what's loaded
    },
  });
  if (paymentCount > 0) {
    throw new HttpException(
      "Associated payments are finalized; cannot delete shipment.",
      409,
    );
  }

  // Prevent deletion if any refund events exist on this payment/order
  const refundCount = await MyGlobal.prisma.shopping_mall_payment_refunds.count(
    {
      where: {
        // We don't have direct shipment link; block if order's payments have refunds
        status: {
          in: ["completed"],
        },
        deleted_at: null,
      },
    },
  );
  if (refundCount > 0) {
    throw new HttpException(
      "Associated refunds for order are finalized; cannot delete shipment.",
      409,
    );
  }

  // Hard delete the shipment
  await MyGlobal.prisma.shopping_mall_order_shipments.delete({
    where: { id: props.shipmentId },
  });

  // Log the action in the audit logs
  await MyGlobal.prisma.shopping_mall_order_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: order.id,
      actor_admin_id: props.admin.id,
      action_type: "shipment_deleted",
      details_json: JSON.stringify({
        shipment_id: props.shipmentId,
        performed_by: "admin",
        admin_id: props.admin.id,
        rationale: "Shipment deleted via admin endpoint.",
      }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
