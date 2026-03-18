import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminOrdersOversight(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const orderId: string & tags.Format<"uuid"> =
      props.body.shopping_mall_payment_id;
    const actionSignal: string = props.body.ship_to_detail_address;
    const reason: string =
      props.body.shipping_instructions ?? props.body.ship_to_region;
    const isForceCancel: boolean = actionSignal === "force_cancel";
    const isForceRefund: boolean = actionSignal === "force_refund";
    if (!isForceCancel && !isForceRefund) {
      throw new HttpException("Invalid oversight action", 422);
    }
    const targetLineItemStatus: string = isForceCancel
      ? "cancelled"
      : "refunded";
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: orderId, deleted_at: null },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        line_item_status: true,
      },
    });
    if (orderItems.length === 0) {
      throw new HttpException("Order not found", 404);
    }
    const terminalStatusRank: Record<string, number> = {
      created: 0,
      shipped: 1,
      delivered: 2,
      cancellation_requested: 3,
      cancelled: 4,
      refund_requested: 5,
      refunded: 6,
    };
    for (const orderItem of orderItems) {
      const currentRank: number =
        terminalStatusRank[orderItem.line_item_status] ?? -1;
      const targetRank: number =
        terminalStatusRank[targetLineItemStatus] ?? 999;
      if (currentRank !== -1 && targetRank < currentRank) {
        throw new HttpException("Forced transition not allowed", 409);
      }
      await tx.shopping_mall_order_items.update({
        where: { id: orderItem.id },
        data: {
          line_item_status: targetLineItemStatus,
          updated_at: toISOStringSafe(new Date()) as any,
        },
        select: { id: true },
      });
      const latestInventory =
        await tx.shopping_mall_inventory_records.findFirst({
          where: {
            shopping_mall_product_variant_id:
              orderItem.shopping_mall_product_variant_id,
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: {
            stock_quantity: true,
            reserved_quantity: true,
            available_quantity: true,
          },
        });
      if (latestInventory !== null) {
        const restoredStock: number =
          latestInventory.stock_quantity + orderItem.quantity;
        const restoredReserved: number = Math.max(
          0,
          latestInventory.reserved_quantity - orderItem.quantity,
        );
        const restoredAvailable: number =
          latestInventory.available_quantity + orderItem.quantity;
        await tx.shopping_mall_inventory_records.create({
          data: {
            id: v4(),
            shopping_mall_product_variant_id:
              orderItem.shopping_mall_product_variant_id,
            stock_quantity: restoredStock,
            reserved_quantity: restoredReserved,
            available_quantity: restoredAvailable,
            deleted_at: null,
            created_at: toISOStringSafe(new Date()) as any,
            updated_at: toISOStringSafe(new Date()) as any,
          },
        });
      }
      const snapshotSourceType: string = isForceCancel
        ? "order_item_force_cancel"
        : "order_item_force_refund";
      const snapshotAlreadyExists = await tx.shopping_mall_snapshots.findFirst({
        where: {
          source_type: snapshotSourceType,
          source_order_item_id: orderItem.id,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (snapshotAlreadyExists === null) {
        const snapshotId: string & tags.Format<"uuid"> = v4();
        const snapshotCode: string = `snap_${snapshotId.replace(/-/g, "").slice(0, 20)}`;
        await tx.shopping_mall_snapshots.create({
          data: {
            id: snapshotId,
            snapshot_code: snapshotCode,
            source_type: snapshotSourceType,
            source_entity_id: orderItem.id,
            source_seller_id: null,
            source_order_id: orderId,
            source_order_item_id: orderItem.id,
            source_review_id: null,
            source_cancellation_request_id: null,
            source_refund_request_id: null,
            created_by_member_id: null,
            reason,
            deleted_at: null,
            created_at: toISOStringSafe(new Date()) as any,
            updated_at: toISOStringSafe(new Date()) as any,
          },
        });
        await tx.shopping_mall_snapshot_payloads.create({
          data: {
            id: v4(),
            shopping_mall_snapshot_id: snapshotId,
            payload: JSON.stringify({
              order_item_id: orderItem.id,
              action: targetLineItemStatus,
              reason,
            }),
            deleted_at: null,
            created_at: toISOStringSafe(new Date()) as any,
            updated_at: toISOStringSafe(new Date()) as any,
          },
        });
        await tx.shopping_mall_snapshot_parties.createMany({
          data: [
            {
              id: v4(),
              shopping_mall_snapshot_id: snapshotId,
              party_type: "admin",
              party_id: props.admin.id,
              can_view: true,
              deleted_at: null,
              created_at: toISOStringSafe(new Date()) as any,
              updated_at: toISOStringSafe(new Date()) as any,
            },
          ],
        });
      }
    }
  });
}
