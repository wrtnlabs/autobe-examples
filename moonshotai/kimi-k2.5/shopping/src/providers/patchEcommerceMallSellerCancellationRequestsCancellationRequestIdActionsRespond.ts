import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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

export async function patchEcommerceMallSellerCancellationRequestsCancellationRequestIdActionsRespond(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IRespond;
}): Promise<IEcommerceMallCancellationRequest> {
  // Fetch cancellation request with order item for ownership verification
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      select: {
        id: true,
        status: true,
        order_item_id: true,
        customer_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            seller_id: true,
            quantity: true,
            variant_id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Validate status is pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      `Cancellation request is already ${cancellationRequest.status}`,
      400,
    );
  }
  // Verify seller owns the order item
  if (cancellationRequest.orderItem.seller_id !== props.seller.id) {
    throw new HttpException(
      "You can only respond to cancellation requests for your own products",
      403,
    );
  }
  const newStatus = props.body.action === "approve" ? "approved" : "rejected";
  const now = new Date();
  // Execute transaction: update request, create snapshot, handle approval side effects
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update cancellation request
    await tx.ecommerce_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: newStatus,
        response_reason: props.body.reason ?? null,
        responded_at: now,
        updated_at: now,
        seller: { connect: { id: props.seller.id } },
      },
    });
    // Create snapshot for audit trail
    await tx.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        cancellation_request_id: props.cancellationRequestId,
        status_before: "pending",
        status_after: newStatus,
        reason_before: cancellationRequest.reason,
        reason_after: cancellationRequest.reason,
        reviewer_note: props.body.reason ?? null,
        created_at: now,
      },
    });
    // Handle approval side effects
    if (props.body.action === "approve") {
      // Update order item status to cancelled
      await tx.ecommerce_mall_order_items.update({
        where: { id: cancellationRequest.order_item_id },
        data: {
          status: "cancelled",
          updated_at: now,
        },
      });
      // Restore inventory with positive quantity_change
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4(),
          product_variant_id: cancellationRequest.orderItem.variant_id,
          quantity_change: cancellationRequest.orderItem.quantity,
          reason: "cancellation_restored",
          created_at: now,
        },
      });
    }
  });
  // Fetch updated cancellation request with full relations for transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(updated);
}
