import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerOrdersOrderIdItemsItemIdCancellationRequestsRequestId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IUpdate;
}): Promise<IEcommerceCancellationRequest> {
  // Validate order item belongs to order
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      ecommerce_order_id: true,
      ecommerce_product_variant_id: true,
      ecommerce_seller_id: true,
      status: true,
      quantity: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to specified order",
      400,
    );
  }
  // Validate cancellation request belongs to order item
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_order_item_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  if (cancellationRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException(
      "Cancellation request does not belong to specified order item",
      400,
    );
  }
  if (cancellationRequest.deleted_at !== null) {
    throw new HttpException("Cancellation request has been deleted", 410);
  }
  // Check status is pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // Verify seller owns the order item
  if (orderItem.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate body status
  if (props.body.status === undefined) {
    throw new HttpException("Status is required", 400);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  // Validate seller_response is provided when status changes from pending
  if (
    props.body.seller_response === undefined ||
    props.body.seller_response === null ||
    props.body.seller_response.trim().length === 0
  ) {
    throw new HttpException(
      "Seller response is required when approving or rejecting",
      400,
    );
  }
  const previousStatus = cancellationRequest.status;
  const newStatus = props.body.status;
  const sellerResponse = props.body.seller_response;
  // Update cancellation request
  await MyGlobal.prisma.ecommerce_cancellation_requests.update({
    where: { id: props.requestId },
    data: {
      status: newStatus,
      seller_response: sellerResponse,
      updated_at: new Date(),
    },
  });
  // Create snapshot
  await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      ecommerce_cancellation_request_id: props.requestId,
      created_at: new Date(),
      status_before: previousStatus,
      status_after: newStatus,
      changed_by_actor_id: props.seller.id,
      changed_by_actor_type: "seller",
      change_reason: sellerResponse,
    },
  });
  // If approved, update order item and restore inventory
  if (newStatus === "approved") {
    // Update order item status to cancelled
    await MyGlobal.prisma.ecommerce_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
    // Restore inventory
    await MyGlobal.prisma.ecommerce_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_product_variant_id: orderItem.ecommerce_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: "cancel",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Recalculate order status
    const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
      where: { ecommerce_order_id: props.orderId, deleted_at: null },
      select: { status: true },
    });
    if (orderItems.length > 0) {
      const allCancelled = orderItems.every(
        (item) => item.status === "cancelled",
      );
      const allRefunded = orderItems.every(
        (item) => item.status === "refunded",
      );
      const allDelivered = orderItems.every(
        (item) => item.status === "delivered",
      );
      const anyShipped = orderItems.some((item) => item.status === "shipped");
      const anyPaid = orderItems.some((item) => item.status === "paid");
      let newOrderStatus: string;
      if (allCancelled) {
        newOrderStatus = "cancelled";
      } else if (allRefunded) {
        newOrderStatus = "refunded";
      } else if (allDelivered) {
        newOrderStatus = "delivered";
      } else if (anyShipped) {
        newOrderStatus = "shipped";
      } else if (anyPaid) {
        newOrderStatus = "paid";
      } else {
        newOrderStatus = "partially_completed";
      }
      await MyGlobal.prisma.ecommerce_orders.update({
        where: { id: props.orderId },
        data: {
          status: newOrderStatus,
          updated_at: new Date(),
        },
      });
    }
  }
  // Fetch updated cancellation request
  const updated =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...EcommerceCancellationRequestTransformer.select(),
    });
  return await EcommerceCancellationRequestTransformer.transform(updated);
}
