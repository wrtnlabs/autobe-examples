import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

export async function putShoppingMallAdminAdminCancellationRequestsCancellationRequestId(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const now = toISOStringSafe(new Date());
  const existing =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          ...ShoppingMallCancellationRequestTransformer.select(),
          status: true,
          deleted_at: true,
          seller_decisioned_at: true,
          shopping_mall_order_item_id: true,
          seller_response_reason: true,
        },
      },
    );
  if (existing.deleted_at !== null) {
    throw new HttpException("Cancellation request is deleted", 409);
  }
  if (existing.seller_decisioned_at !== null) {
    throw new HttpException("Cancellation request already decided", 409);
  }
  if (props.body.status === undefined) {
    throw new HttpException("status is required", 400);
  }
  const targetStatus = props.body.status;
  if (targetStatus === existing.status) {
    throw new HttpException("No-op status update", 409);
  }
  const decidedIsRefund = /refund/i.test(targetStatus);
  const targetLineItemStatus = decidedIsRefund ? "refunded" : "cancelled";
  const [updatedCancellation] = await MyGlobal.prisma.$transaction(
    async (tx) => {
      const orderItem = await tx.shopping_mall_order_items.findUniqueOrThrow({
        where: { id: existing.shopping_mall_order_item_id },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
          quantity: true,
          line_item_status: true,
        },
      });
      if (orderItem.line_item_status === targetLineItemStatus) {
        throw new HttpException("Order item already in target state", 409);
      }
      if (!decidedIsRefund && orderItem.line_item_status === "refunded") {
        throw new HttpException("Order item already refunded", 409);
      }
      if (decidedIsRefund && orderItem.line_item_status === "cancelled") {
        throw new HttpException("Order item already cancelled", 409);
      }
      const latest = await tx.shopping_mall_inventory_records.findFirst({
        where: {
          shopping_mall_product_variant_id:
            orderItem.shopping_mall_product_variant_id,
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          stock_quantity: true,
          reserved_quantity: true,
          available_quantity: true,
        },
      });
      if (latest === null) {
        throw new HttpException("Inventory baseline not found", 409);
      }
      const delta = orderItem.quantity;
      const newStockQuantity = latest.stock_quantity + delta;
      const newAvailableQuantity = latest.available_quantity + delta;
      if (newStockQuantity < 0 || newAvailableQuantity < 0) {
        throw new HttpException("Invalid inventory restoration result", 409);
      }
      await tx.shopping_mall_order_items.update({
        where: { id: orderItem.id },
        data: {
          line_item_status: targetLineItemStatus,
          updated_at: now,
        },
        select: { id: true },
      });
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_product_variant_id:
            orderItem.shopping_mall_product_variant_id,
          stock_quantity: newStockQuantity,
          reserved_quantity: latest.reserved_quantity,
          available_quantity: newAvailableQuantity,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        select: { id: true },
      });
      const updatedCancellation =
        await tx.shopping_mall_cancellation_requests.update({
          where: { id: props.cancellationRequestId },
          data: {
            status: targetStatus,
            seller_response_reason:
              props.body.seller_response_reason === undefined
                ? existing.seller_response_reason
                : props.body.seller_response_reason,
            seller_decisioned_at: now,
            updated_at: now,
          },
          ...ShoppingMallCancellationRequestTransformer.select(),
        });
      return [updatedCancellation] as const;
    },
  );
  return ShoppingMallCancellationRequestTransformer.transform(
    updatedCancellation,
  );
}
