import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string;
  body: IShoppingMallCancellationRequest.IResponse;
}): Promise<void> {
  // Verify cancellation request exists
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
      include: { orderItem: true },
    });
  if (!cancellationRequest) {
    throw new HttpException("Cancellation request not found", 404);
  }
  // Verify cancellation request is for seller's product
  if (cancellationRequest.orderItem.seller_id !== props.seller.id) {
    throw new HttpException(
      "Unauthorized - This cancellation request is not for your product",
      403,
    );
  }
  // Verify cancellation request is still pending
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been resolved",
      400,
    );
  }
  // Update cancellation request based on action
  if (props.body.action === "approve") {
    // Restore inventory for the product variant
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        variant_id: cancellationRequest.orderItem.variant_id,
        quantity_change: cancellationRequest.orderItem.quantity,
        reason: "cancellation_approved",
        // Use seller_id scalar field directly, not relation with connect syntax
        seller_id: props.seller.id,
        source_transaction_id: props.cancellationRequestId,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
    // Update cancellation request status
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "approved",
        responded_at: toISOStringSafe(new Date()),
        // Use responder with connect syntax as before - this was already correct
        responder: { connect: { id: props.seller.id } },
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } else {
    // props.body.action must be "reject" due to TypeScript type safety
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        status: "rejected",
        responded_at: toISOStringSafe(new Date()),
        // Use responder with connect syntax as before - this was already correct
        responder: { connect: { id: props.seller.id } },
        reason: props.body.reason === null ? undefined : props.body.reason,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
}
