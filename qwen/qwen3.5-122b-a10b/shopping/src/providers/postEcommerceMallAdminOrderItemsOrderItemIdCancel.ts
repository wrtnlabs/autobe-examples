import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallOrderItemCancellationRequestCollector } from "../collectors/EcommerceMallOrderItemCancellationRequestCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemCancellationRequestTransformer } from "../transformers/EcommerceMallOrderItemCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminOrderItemsOrderItemIdCancel(props: {
  admin: AdminPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemCancellationRequest.ICreate;
}): Promise<IEcommerceMallOrderItemCancellationRequest> {
  // 1. Verify order item exists
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: { id: true, status: true },
    });
  // 2. Verify order item status is 'paid' (cancellation requests only for paid status)
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Order item is not in paid status and cannot be cancelled via cancellation request",
      400,
    );
  }
  // 3. Check no existing pending/approved cancellation request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findFirst(
      {
        where: {
          order_item_id: props.orderItemId,
          status: { in: ["pending", "approved"] },
          deleted_at: null,
        },
      },
    );
  if (existingRequest) {
    throw new HttpException(
      "Cancellation request already exists for this order item",
      400,
    );
  }
  // 4. Create cancellation request using collector
  const cancellationRequestData =
    await EcommerceMallOrderItemCancellationRequestCollector.collect({
      body: props.body,
      ecommerceMallOrderItems: orderItem,
    });
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.create(
      {
        data: cancellationRequestData,
        ...EcommerceMallOrderItemCancellationRequestTransformer.select(),
      },
    );
  // 5. Create a snapshot of the cancellation request state for audit trail
  await MyGlobal.prisma.ecommerce_mall_order_item_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      orderItem: { connect: { id: orderItem.id } },
      snapshot_type: "cancellation",
      previous_values: null,
      current_values: JSON.stringify({
        cancellation_request_id: cancellationRequest.id,
        reason: cancellationRequest.reason,
        status: cancellationRequest.status,
        requested_at: toISOStringSafe(cancellationRequest.requested_at),
      }),
      created_at: toISOStringSafe(new Date()),
      changedBy: { connect: { id: props.admin.id } },
    } satisfies Prisma.ecommerce_mall_order_item_snapshotsCreateInput,
  });
  // 6. Return the created cancellation request
  return await EcommerceMallOrderItemCancellationRequestTransformer.transform(
    cancellationRequest,
  );
}
