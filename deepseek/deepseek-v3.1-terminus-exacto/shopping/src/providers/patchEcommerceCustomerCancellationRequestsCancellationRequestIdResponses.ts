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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCancellationRequestTransformer } from "../transformers/EcommerceCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceCustomerCancellationRequestsCancellationRequestIdResponses(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IUpdate;
}): Promise<IEcommerceCancellationRequest> {
  // Validate seller exists and is active
  const seller = await MyGlobal.prisma.ecommerce_sellers.findUniqueOrThrow({
    where: {
      id: props.customer.id,
      deleted_at: null,
      account_status: "active",
    },
  });
  // Verify cancellation request exists
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId, deleted_at: null },
      include: {
        orderItem: { select: { id: true, status: true } },
        seller: { select: { id: true } },
      },
    });
  // Authorization check
  if (cancellationRequest.ecommerce_seller_id !== props.customer.id) {
    throw new HttpException(
      "Only the seller of this product can respond to cancellation requests",
      403,
    );
  }
  // Check order item is in paid status
  if (cancellationRequest.orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation can only be requested for paid order items",
      400,
    );
  }
  const now = new Date();
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Create response record
    await tx.ecommerce_cancellation_response_records.upsert({
      where: { ecommerce_cancellation_request_id: props.cancellationRequestId },
      create: {
        id: v4(),
        decision: props.body.decision,
        response_reason: props.body.reason,
        cancellationRequest: { connect: { id: props.cancellationRequestId } },
        seller: { connect: { id: props.customer.id } },
        responded_at: now,
        created_at: now,
      },
      update: {
        decision: props.body.decision,
        response_reason: props.body.reason,
        responded_at: now,
      },
    });
    // Handle approved cancellation
    if (props.body.decision === "approved") {
      // Get order item details for inventory restoration
      const orderItem = await tx.ecommerce_order_items.findUniqueOrThrow({
        where: { id: cancellationRequest.ecommerce_order_item_id },
        include: { productVariant: true },
      });
      // Create inventory restoration record
      await tx.ecommerce_modification_inventory_restorations.create({
        data: {
          id: v4(),
          quantity_restored: orderItem.quantity,
          restoration_reason: `Cancellation approved: ${props.body.reason.substring(0, 100)}`,
          cancellationRequest: { connect: { id: props.cancellationRequestId } },
          inventoryRecord: {
            connect: { id: orderItem.product_variant_id },
          },
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      // Update product variant quantity
      await tx.ecommerce_product_variants.update({
        where: { id: orderItem.product_variant_id },
        data: { quantity: { increment: orderItem.quantity } },
      });
      // Update order item status to cancelled
      await tx.ecommerce_order_items.update({
        where: { id: cancellationRequest.ecommerce_order_item_id },
        data: { status: "cancelled" },
      });
    }
    // Update cancellation request timestamp
    await tx.ecommerce_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: { updated_at: now },
    });
    // Return updated request
    const updatedRequest =
      await tx.ecommerce_cancellation_requests.findUniqueOrThrow({
        where: { id: props.cancellationRequestId },
        ...EcommerceCancellationRequestTransformer.select(),
      });
    return await EcommerceCancellationRequestTransformer.transform(
      updatedRequest,
    );
  });
}
