import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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

export async function putShoppingMallAdminOrderItemsItemIdForceRefund(props: {
  admin: AdminPayload;
  itemId: string;
  body: IShoppingMallOrderItem.IForceRefund;
}): Promise<void> {
  const item =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        item_status: true,
        shopping_mall_order_product_snapshot_id: true,
        shopping_mall_order_variant_snapshot_id: true,
        shopping_mall_order_seller_profile_snapshot_id: true,
      },
    });
  // Update order item status to 'refunded'
  await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      item_status: "refunded",
    },
  });
  // Create status log for the change
  await MyGlobal.prisma.shopping_mall_order_item_status_logs.create({
    data: {
      id: v4(),
      shopping_mall_order_item_id: props.itemId,
      from_status: item.item_status,
      to_status: "refunded",
      changed_by: "admin",
      changed_by_id: props.admin.id,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // Restore inventory by creating positive history record
  await MyGlobal.prisma.shopping_mall_inventory_histories.create({
    data: {
      id: v4(),
      shopping_mall_product_variant_id:
        item.shopping_mall_order_variant_snapshot_id,
      quantity_change: 1,
      reason: "administrator adjustment",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // Create refund payment record
  await MyGlobal.prisma.shopping_mall_refund_payments.create({
    data: {
      id: v4(),
      refund_request_id: props.itemId,
      order_item_id: props.itemId,
      customer_id: item.shopping_mall_order_seller_profile_snapshot_id,
      refund_amount: 0,
      currency: "USD",
      status: "completed",
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // Log administrator action for audit
  await MyGlobal.prisma.shopping_mall_system_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      operation_type: "force_refund",
      entity_type: "order_item",
      entity_id: props.itemId,
      ip_address: "0.0.0.0",
      user_agent: "Administrator API",
      new_values: JSON.stringify({
        reason: props.body.reason,
        order_item_id: props.itemId,
      }),
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
