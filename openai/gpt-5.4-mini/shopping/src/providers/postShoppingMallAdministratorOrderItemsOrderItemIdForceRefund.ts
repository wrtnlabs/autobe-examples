import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorOrderItemsOrderItemIdForceRefund(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IForceRefund;
}): Promise<void> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
        refunded_at: true,
        order: {
          select: {
            id: true,
            status: true,
          },
        },
        refundRequests: {
          select: {
            id: true,
            reason: true,
            status: true,
            reviewed_reason: true,
          },
        },
      },
    });
  if (orderItem.status === "cancelled" || orderItem.status === "refunded") {
    throw new HttpException("Duplicate force-refund intervention", 409);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data: {
        status: "refunded",
        refunded_at: orderItem.refunded_at ?? new Date(),
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          orderItem.shopping_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: props.body.reason ?? "administrative force refund",
        occurred_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    if (orderItem.refundRequests.length > 0) {
      await tx.shopping_mall_refund_request_snapshots.create({
        data: {
          id: v4(),
          shopping_mall_refund_request_id: orderItem.refundRequests[0].id,
          status: "approved",
          reason: orderItem.refundRequests[0].reason,
          response_message: props.body.reason ?? null,
          created_at: new Date(),
        },
      });
      await tx.shopping_mall_refund_requests.update({
        where: { id: orderItem.refundRequests[0].id },
        data: {
          status: "approved",
          reviewed_at: new Date(),
          reviewed_reason:
            props.body.reason ?? orderItem.refundRequests[0].reviewed_reason,
          updated_at: new Date(),
        },
      });
    }
    const statuses = await tx.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: orderItem.shopping_mall_order_id,
        deleted_at: null,
      },
      select: {
        status: true,
      },
    });
    const nextStatus = statuses.every((item) => item.status === "refunded")
      ? "refunded"
      : statuses.every((item) => item.status === "cancelled")
        ? "cancelled"
        : statuses.some((item) => item.status === "delivered")
          ? "delivered"
          : statuses.some((item) => item.status === "shipped")
            ? "shipped"
            : statuses.some((item) => item.status === "paid")
              ? "paid"
              : orderItem.order.status;
    await tx.shopping_mall_orders.update({
      where: { id: orderItem.shopping_mall_order_id },
      data: {
        status: nextStatus,
        updated_at: new Date(),
      },
    });
  });
}
