import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminCancellationRequestsCancellationRequestId(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  // Step 1: Find the cancellation request
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          shopping_mall_order_item_id: true,
          status: true,
          reason: true,
          rejection_reason: true,
          requested_at: true,
          responded_at: true,
          shopping_mall_seller_id: true,
        },
      },
    );
  // Step 2: Validate status is 'pending'
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request is not in pending status",
      400,
    );
  }
  // Step 3: Create cancellation snapshot BEFORE updating
  const snapshotData = {
    previous_state: {
      status: cancellationRequest.status,
      reason: cancellationRequest.reason,
      requested_at: cancellationRequest.requested_at.toISOString(),
      responded_at: cancellationRequest.responded_at?.toISOString() ?? null,
      rejection_reason: cancellationRequest.rejection_reason ?? null,
    },
    new_state: {
      status: props.body.status,
      rejection_reason: props.body.rejection_reason ?? null,
      responded_at: new Date().toISOString(),
      seller_id: props.admin.id,
    },
  };
  await MyGlobal.prisma.shopping_mall_cancellation_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_cancellation_request_id: props.cancellationRequestId,
      snapshot_data: JSON.stringify(snapshotData),
      created_at: new Date(),
    },
  });
  // Step 4: Update cancellation request
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
    where: { id: props.cancellationRequestId },
    data: {
      status: props.body.status,
      rejection_reason: props.body.rejection_reason ?? null,
      shopping_mall_seller_id: props.admin.id,
      responded_at: now,
      updated_at: now,
    },
  });
  // Step 5: If approved, update order item status to 'cancelled'
  if (props.body.status === "approved") {
    await MyGlobal.prisma.shopping_mall_order_items.update({
      where: { id: cancellationRequest.shopping_mall_order_item_id },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
  }
  // Step 6 & 7: Fetch and transform updated cancellation request
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
