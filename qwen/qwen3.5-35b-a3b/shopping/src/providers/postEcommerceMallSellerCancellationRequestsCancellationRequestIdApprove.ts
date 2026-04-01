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
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const snapshotId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const inventoryRecordId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const inventorySnapshotId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const activityLogId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const cancellationRequest =
      await tx.ecommerce_mall_cancellation_requests.findUniqueOrThrow({
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        include: {
          orderItem: {
            select: {
              id: true,
              quantity: true,
              variant_snapshot_id: true,
            },
          },
          customer: true,
          seller: true,
        },
      });
    if (cancellationRequest.status !== "pending") {
      throw new HttpException("Cancellation request is not pending", 400);
    }
    if (cancellationRequest.seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    const productVariantId: string & tags.Format<"uuid"> =
      cancellationRequest.orderItem.variant_snapshot_id;
    await tx.ecommerce_mall_cancellation_request_snapshots.create({
      data: {
        id: snapshotId,
        cancellation_request_id: props.cancellationRequestId,
        actor_type: "seller",
        status_before: "pending",
        status_after: "approved",
        action: "approved",
        created_at: now,
        updated_at: now,
      },
    });
    await tx.ecommerce_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "approved",
        updated_at: now,
      },
    });
    await tx.ecommerce_mall_order_items.update({
      where: { id: cancellationRequest.order_item_id },
      data: {
        updated_at: now,
      },
    });
    await tx.ecommerce_mall_inventory_records.create({
      data: {
        id: inventoryRecordId,
        ecommerce_mall_product_variant_id: productVariantId,
        ecommerce_mall_cancellation_request_id: props.cancellationRequestId,
        quantity_change: cancellationRequest.orderItem.quantity,
        remaining_quantity: 0,
        reason: "CANCELLATION",
        type: "INCOMING",
        description: "Stock restored due to cancellation approval",
        created_at: now,
        updated_at: now,
      },
    });
    await tx.ecommerce_mall_activity_logs.create({
      data: {
        id: activityLogId,
        actor_type: "seller",
        entity_type: "cancellation_request",
        entity_id: props.cancellationRequestId,
        action_type: "approve_cancellation_request",
        action_description: "Seller approved cancellation request",
        created_at: now,
        updated_at: now,
      },
    });
  });
  const updatedCancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...EcommerceMallCancellationRequestTransformer.select(),
      },
    );
  return await EcommerceMallCancellationRequestTransformer.transform(
    updatedCancellationRequest,
  );
}
