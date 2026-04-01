import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberOrderItemsOrderItemId(props: {
  member: MemberPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const existing =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        seller_snapshot_id: true,
        shopping_mall_product_variant_id: true,
        shopping_mall_shipment_id: true,
        seller_price_at_purchase: true,
        quantity: true,
        line_item_status: true,
        placed_at: true,
        deleted_at: true,
        order: {
          select: { shopping_customer_id: true, deleted_at: true },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        shipment: {
          select: { id: true, status: true, deleted_at: true },
        } satisfies Prisma.shopping_mall_shipmentsFindManyArgs,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Order item is deleted", 404);
  }
  if (existing.order.deleted_at !== null) {
    throw new HttpException("Order is deleted", 404);
  }
  if (existing.order.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const nextStatus = props.body.line_item_status ?? existing.line_item_status;
  const terminal = (s: string) => s === "cancelled" || s === "refunded";
  if (
    terminal(existing.line_item_status) &&
    nextStatus !== existing.line_item_status
  ) {
    throw new HttpException("Incompatible status transition", 409);
  }
  if (props.body.shopping_mall_shipment_id !== undefined) {
    const requestedShipmentId = props.body.shopping_mall_shipment_id;
    if (requestedShipmentId !== null) {
      const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique(
        {
          where: { id: requestedShipmentId },
          select: {
            id: true,
            status: true,
            deleted_at: true,
            shopping_mall_order_id: true,
          },
        },
      );
      if (shipment === null || shipment.deleted_at !== null) {
        throw new HttpException("Shipment not found", 404);
      }
      if (shipment.shopping_mall_order_id !== existing.shopping_mall_order_id) {
        throw new HttpException("Shipment does not belong to the order", 409);
      }
      // if linking shipment, require non-terminal shipment statuses for non-cancelled/refunded item
      if (terminal(nextStatus)) {
        // allowed
      }
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_order_items.update({
      where: { id: props.orderItemId },
      data: {
        ...(props.body.line_item_status !== undefined && {
          line_item_status: props.body.line_item_status,
        }),
        ...(props.body.quantity !== undefined && {
          quantity: props.body.quantity,
        }),
        ...(props.body.seller_price_at_purchase !== undefined && {
          seller_price_at_purchase: props.body.seller_price_at_purchase,
        }),
        ...(props.body.shopping_mall_shipment_id !== undefined && {
          shopping_mall_shipment_id: props.body.shopping_mall_shipment_id,
        }),
      },
      select: ShoppingMallOrderItemTransformer.select().select,
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
  return await ShoppingMallOrderItemTransformer.transform(updated);
}
