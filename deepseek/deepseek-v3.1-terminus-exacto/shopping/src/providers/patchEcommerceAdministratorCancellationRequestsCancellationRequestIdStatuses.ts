import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorCancellationRequestsCancellationRequestIdStatuses(props: {
  administrator: AdministratorPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IUpdate;
}): Promise<IEcommerceCancellationRequest> {
  // First, validate the cancellation request exists
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        ecommerce_order_item_id: true,
        ecommerce_seller_id: true,
        deleted_at: true,
      },
    });
  // Check if cancellation request is already deleted
  if (cancellationRequest.deleted_at !== null) {
    throw new HttpException("Cancellation request has been deleted", 400);
  }
  // Check the current status of the order item
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: cancellationRequest.ecommerce_order_item_id },
      select: { status: true },
    });
  // Validate that the order item is in 'paid' status (required for cancellation)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation can only be processed for order items in 'paid' status",
      400,
    );
  }
  const now = new Date();
  // Create status transition record
  await MyGlobal.prisma.ecommerce_cancellation_request_statuses.create({
    data: {
      id: v4(),
      ecommerce_cancellation_request_id: props.cancellationRequestId,
      status: props.body.decision,
      transition_notes: props.body.reason,
      created_at: now,
      updated_at: now,
    },
  });
  // Handle approval vs rejection logic
  if (props.body.decision === "approved") {
    // Create response record for approved cancellation
    await MyGlobal.prisma.ecommerce_cancellation_response_records.create({
      data: {
        id: v4(),
        ecommerce_cancellation_request_id: props.cancellationRequestId,
        ecommerce_seller_id: cancellationRequest.ecommerce_seller_id,
        decision: "approved",
        response_reason: props.body.reason,
        responded_at: now,
        created_at: now,
      },
    });
    // Update order item status to 'cancelled'
    await MyGlobal.prisma.ecommerce_order_items.update({
      where: { id: cancellationRequest.ecommerce_order_item_id },
      data: {
        status: "cancelled",
      },
    });
    // Restore inventory (get quantity from order item)
    const orderItemDetails =
      await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
        where: { id: cancellationRequest.ecommerce_order_item_id },
        select: { quantity: true },
      });
    // Find existing inventory record for restoration
    const inventoryRecord =
      await MyGlobal.prisma.ecommerce_inventory_records.findFirst({
        where: {
          ecommerce_order_id: cancellationRequest.ecommerce_order_item_id,
        },
      });
    if (inventoryRecord) {
      await MyGlobal.prisma.ecommerce_modification_inventory_restorations.create(
        {
          data: {
            id: v4(),
            ecommerce_cancellation_request_id: props.cancellationRequestId,
            ecommerce_inventory_record_id: inventoryRecord.id,
            quantity_restored: orderItemDetails.quantity,
            restoration_reason: "Cancellation approved - inventory restoration",
            created_at: now,
            updated_at: now,
          },
        },
      );
    }
  } else {
    // For rejected decisions, create response record only
    await MyGlobal.prisma.ecommerce_cancellation_response_records.create({
      data: {
        id: v4(),
        ecommerce_cancellation_request_id: props.cancellationRequestId,
        ecommerce_seller_id: cancellationRequest.ecommerce_seller_id,
        decision: "rejected",
        response_reason: props.body.reason,
        responded_at: now,
        created_at: now,
      },
    });
  }
  // Update cancellation request timestamp
  await MyGlobal.prisma.ecommerce_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: { updated_at: now },
  });
  // Return updated cancellation request with full details
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      ...EcommerceCancellationRequestTransformer.select(),
    });
  return await EcommerceCancellationRequestTransformer.transform(
    updatedRequest,
  );
}
