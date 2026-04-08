import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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

export async function putEcommerceMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IUpdate;
}): Promise<IEcommerceMallRefundRequest> {
  // Find the refund request and verify ownership
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        order_item_id: true,
        reason: true,
        status: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            variant: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found or not authorized", 404);
  }
  // Check that the refund request is still pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request has already been processed", 400);
  }
  // Validate response reason is provided when rejecting
  if (props.body.status === "rejected" && !props.body.responseReason) {
    throw new HttpException(
      "Response reason is required when rejecting a refund request",
      400,
    );
  }
  const now = new Date();
  // Perform atomic transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update refund request
    await tx.ecommerce_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: props.body.status,
        responded_at: now,
        updated_at: now,
      },
    });
    // Create snapshot record
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
    // If approved, update order item and create inventory record
    if (props.body.status === "approved") {
      // Update order item status to refunded
      await tx.ecommerce_mall_order_items.update({
        where: { id: refundRequest.order_item_id },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // Create inventory record to restore stock
      if (refundRequest.orderItem?.variant?.id) {
        await tx.ecommerce_mall_inventory_records.create({
          data: {
            id: v4(),
            product_variant_id: refundRequest.orderItem.variant.id,
            quantity_change: refundRequest.orderItem.quantity,
            reason: "Refund Restoration",
            created_at: now,
          },
        });
      }
    }
  });
  // Query full refund request with all relations for transformation
  const updatedRefundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  // Transform and return
  return await EcommerceMallRefundRequestTransformer.transform(
    updatedRefundRequest,
  );
}
