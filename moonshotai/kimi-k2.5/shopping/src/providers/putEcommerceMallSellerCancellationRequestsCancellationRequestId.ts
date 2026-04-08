import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { EcommerceMallCancellationRequestTransformer } from "../transformers/EcommerceMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallCancellationRequest.IUpdate;
}): Promise<IEcommerceMallCancellationRequest> {
  // Verify ownership and status
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        id: props.cancellationRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        order_item_id: true,
        status: true,
        reason: true,
        orderItem: {
          select: {
            id: true,
            seller_id: true,
            variant_id: true,
            quantity: true,
          },
        },
      },
    });
  if (cancellationRequest === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  if (cancellationRequest.orderItem.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Request already processed", 409);
  }
  const now = new Date();
  // Create snapshot before update
  await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      cancellation_request_id: cancellationRequest.id,
      status_before: cancellationRequest.status,
      status_after: props.body.status,
      reason_before: cancellationRequest.reason,
      reason_after: cancellationRequest.reason,
      reviewer_note: props.body.responseReason ?? null,
      created_at: now,
    },
  });
  // Update cancellation request
  const updated =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: props.body.status,
        response_reason: props.body.responseReason ?? null,
        seller_id: props.seller.id,
        responded_at: now,
        updated_at: now,
      },
      ...EcommerceMallCancellationRequestTransformer.select(),
    });
  // If approved, restore inventory and update order item
  if (props.body.status === "approved") {
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        product_variant_id: cancellationRequest.orderItem.variant_id,
        quantity_change: cancellationRequest.orderItem.quantity,
        reason: "cancellation_return",
        created_at: now,
      },
    });
    await MyGlobal.prisma.ecommerce_mall_order_items.update({
      where: { id: cancellationRequest.orderItem.id },
      data: {
        status: "cancelled",
        updated_at: now,
      },
    });
  }
  return await EcommerceMallCancellationRequestTransformer.transform(updated);
}
