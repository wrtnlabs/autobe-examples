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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemTransformer } from "../transformers/ShoppingMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminOrderItemsOrderItemId(props: {
  admin: AdminPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const targetStatus = props.body.line_item_status;
  if (targetStatus === undefined) {
    // No-op: return current representation
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const orderItem = await tx.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
    const currentStatus = orderItem.line_item_status;
    if (targetStatus !== undefined && targetStatus !== currentStatus) {
      // Conservative terminal-state compatibility: if already terminal, only allow idempotent change.
      const terminal = new Set(["cancelled", "refunded"]);
      if (terminal.has(currentStatus)) {
        throw new HttpException("Invalid status transition", 400);
      }
      // If item is linked to shipment, forbid cancelling/refunding when shipment already progressed.
      if (orderItem.shopping_mall_shipment_id !== null) {
        const shipment = await tx.shopping_mall_shipments.findUniqueOrThrow({
          where: { id: orderItem.shopping_mall_shipment_id ?? undefined },
          select: { status: true },
        });
        const shipmentBlocked =
          shipment.status === "delivered" || shipment.status === "shipped";
        if (
          shipmentBlocked &&
          (targetStatus === "cancelled" || targetStatus === "refunded")
        ) {
          throw new HttpException("Invalid status transition", 400);
        }
      }
      // Inventory restoration: append inventory record based on latest record for variant.
      const variantId = orderItem.shopping_mall_product_variant_id;
      const latestInventory =
        await tx.shopping_mall_inventory_records.findFirst({
          where: {
            shopping_mall_product_variant_id: variantId,
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: {
            stock_quantity: true,
            reserved_quantity: true,
            available_quantity: true,
          },
        });
      if (!latestInventory) {
        throw new HttpException("Inventory state missing", 400);
      }
      // For forced cancel/refund, restore reserved stock by moving quantity from reserved back to available.
      const restoreDeltaReserved = orderItem.quantity;
      const nextReserved = Math.max(
        0,
        latestInventory.reserved_quantity - restoreDeltaReserved,
      );
      const nextAvailable =
        latestInventory.available_quantity + restoreDeltaReserved;
      const nowIso = "2026-03-31T03:54:04.323Z" satisfies string &
        tags.Format<"date-time">;
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_product_variant_id: variantId,
          stock_quantity: latestInventory.stock_quantity,
          reserved_quantity: nextReserved,
          available_quantity: nextAvailable,
          created_at: nowIso,
          updated_at: nowIso,
          deleted_at: null,
        },
      });
      const updatedAtIso = nowIso;
      await tx.shopping_mall_order_items.update({
        where: { id: props.orderItemId },
        data: {
          line_item_status: targetStatus,
          updated_at: updatedAtIso,
        },
      });
      // Snapshot trail: always create snapshot for administrative outcome change.
      const snapshotNowIso = nowIso;
      const snapshot = await tx.shopping_mall_snapshots.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          snapshot_code: `admin_order_item_${props.orderItemId}_${snapshotNowIso}`,
          source_type: "order_item",
          source_entity_id: props.orderItemId,
          source_order_item_id: props.orderItemId,
          source_order_id: orderItem.shopping_mall_order_id,
          source_seller_id: null,
          created_by_member_id: props.admin.id,
          reason: "admin_force_update",
          created_at: snapshotNowIso,
          updated_at: snapshotNowIso,
          deleted_at: null,
        },
        select: { id: true },
      });
      // Create payload for snapshot.
      await tx.shopping_mall_snapshot_payloads.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_snapshot_id: snapshot.id,
          payload: JSON.stringify({
            orderItemId: props.orderItemId,
            from: currentStatus,
            to: targetStatus,
            quantity: orderItem.quantity,
          }),
          created_at: snapshotNowIso,
          updated_at: snapshotNowIso,
          deleted_at: null,
        },
      });
    }
    const updated = await tx.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      ...ShoppingMallOrderItemTransformer.select(),
    });
    return await ShoppingMallOrderItemTransformer.transform(updated);
  });
}
