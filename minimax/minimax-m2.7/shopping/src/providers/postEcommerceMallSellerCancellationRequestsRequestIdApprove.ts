import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerCancellationRequestsRequestIdApprove(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // 1. Fetch cancellation request and verify ownership/status
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          reason: true,
          ecommerce_mall_seller_id: true,
          ecommerce_mall_order_item_id: true,
        },
      },
    );
  // 2. Verify seller owns this cancellation request
  if (cancellationRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify cancellation request is pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "The cancellation request has already been processed",
      400,
    );
  }
  // 4. Fetch order item and verify eligibility for cancellation
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: cancellationRequest.ecommerce_mall_order_item_id },
      select: {
        id: true,
        ecommerce_mall_product_variant_id: true,
        quantity: true,
        status: true,
      },
    });
  // 5. Verify order item status is 'paid' (cancellation only allowed before shipping)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation can only be requested for items that have not yet been shipped",
      400,
    );
  }
  const now = new Date();
  // 6. Execute all updates in a transaction
  await MyGlobal.prisma.$transaction([
    // Create audit snapshot preserving request state at approval time
    MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_cancellation_request_id: props.requestId,
        reason: cancellationRequest.reason,
        status: "approved",
        created_at: now,
      },
    }),
    // Update cancellation request status to approved
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        updated_at: now,
      },
    }),
    // Update order item status to cancelled
    MyGlobal.prisma.ecommerce_mall_order_items.update({
      where: { id: orderItem.id },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    }),
    // Restore inventory for the cancelled product variant
    MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_mall_product_variant_id:
          orderItem.ecommerce_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: "cancellation",
        created_at: now,
      },
    }),
  ]);
  // 7. Fetch updated cancellation request with all relations for response
  const updated =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  // 8. Transform and return the updated cancellation request
  return await EcommerceMallCancellationRequestTransformer.transform(updated);
}
