import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminItemsItemId(props: {
  superAdmin: SuperadminPayload;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  const now = new Date();
  // Find the order item with related data
  const item =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        order_id: true,
        variant_id: true,
        quantity: true,
        status: true,
        price_at_purchase: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // If no status update requested, return current item
  if (props.body.status === undefined) {
    const result =
      await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
        where: { id: props.itemId },
        ...EcommerceMallOrderItemTransformer.select(),
      });
    return EcommerceMallOrderItemTransformer.transform(result);
  }
  // Validate status transition
  const validTransitions: Record<string, string[]> = {
    paid: ["cancelled"],
    delivered: ["refunded"],
  };
  const allowedNextStatuses = validTransitions[item.status] ?? [];
  if (!allowedNextStatuses.includes(props.body.status)) {
    throw new HttpException(
      `Invalid status transition from '${item.status}' to '${props.body.status}'`,
      400,
    );
  }
  // Perform status update with related operations in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Update order item status
    await tx.ecommerce_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: props.body.status,
        updated_at: now,
      },
    });
    // 2. Create inventory record to restore stock (positive quantity_change)
    await tx.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        variant: {
          connect: { id: item.variant_id },
        },
        quantity_change: item.quantity,
        reason: `order_${props.body.status}`,
        created_at: now,
      },
    });
    // 3. Update order status based on item states
    const orderItems = await tx.ecommerce_mall_order_items.findMany({
      where: { order_id: item.order_id },
      select: { status: true },
    });
    const allStatuses = orderItems.map((i) => i.status);
    const uniqueStatuses = [...new Set(allStatuses)];
    let newOrderStatus: string;
    if (uniqueStatuses.length === 1) {
      newOrderStatus = uniqueStatuses[0];
    } else if (
      uniqueStatuses.every((s) => ["cancelled", "refunded"].includes(s))
    ) {
      newOrderStatus = "refunded";
    } else {
      newOrderStatus = "partially_completed";
    }
    await tx.ecommerce_mall_orders.update({
      where: { id: item.order_id },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
  });
  // Return updated order item
  const updated =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  return await EcommerceMallOrderItemTransformer.transform(updated);
}
