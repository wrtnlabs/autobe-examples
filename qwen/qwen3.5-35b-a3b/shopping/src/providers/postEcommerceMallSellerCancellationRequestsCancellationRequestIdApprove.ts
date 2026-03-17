import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function postEcommerceMallSellerCancellationRequestsCancellationRequestIdApprove(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequest> {
  // 1. Validate cancellation request exists, is pending, and belongs to seller
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirstOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
          status: "pending",
          seller_id: props.seller.id,
        },
      },
    );
  // 2. Fetch order item data needed for inventory and product variant
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: cancellationRequest.order_item_id },
      include: {
        productSnapshot: true,
      },
    },
  );
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  // 3. Create snapshot of approval action
  await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      cancellation_request_id: props.cancellationRequestId,
      actor_type: "seller",
      action: "approved",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 4. Update cancellation request status to approved
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
      ...EcommerceMallCancellationRequestTransformer.select(),
    });
  // 5. Create inventory record to restore stock quantity
  await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: {
      id: v4(),
      ecommerce_mall_product_variant_id: orderItem.variant_snapshot_id,
      quantity_change: orderItem.quantity,
      remaining_quantity: 100,
      type: "restore",
      updated_at: new Date(),
      reason: "cancellation_approved",
      created_at: new Date(),
    },
  });
  // 6. Log activity for audit trail
  await MyGlobal.prisma.ecommerce_mall_activity_logs.create({
    data: {
      id: v4(),
      actor_type: "seller",
      action_type: "cancellation_approved",
      entity_type: "cancellation_request",
      entity_id: props.cancellationRequestId,
      action_description: "Seller approved cancellation request",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 7. Return updated cancellation request using transformer
  return await EcommerceMallCancellationRequestTransformer.transform(
    updatedRequest,
  );
}
