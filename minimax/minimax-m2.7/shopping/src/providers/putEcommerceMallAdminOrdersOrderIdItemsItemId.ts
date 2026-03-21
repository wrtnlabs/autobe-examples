import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  // Validate order exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Validate order item exists and belongs to the specified order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        ecommerce_mall_order_id: props.orderId,
      },
      select: {
        id: true,
        status: true,
        quantity: true,
        ecommerce_mall_product_variant_id: true,
      },
    });
  // Validate status transition based on admin action
  if (props.body.status === "force_cancelled") {
    if (orderItem.status !== "paid") {
      throw new HttpException(
        `Cannot force-cancel order item with status '${orderItem.status}'. Only items with 'paid' status can be force-cancelled.`,
        400,
      );
    }
  } else if (props.body.status === "force_refunded") {
    if (orderItem.status !== "delivered") {
      throw new HttpException(
        `Cannot force-refund order item with status '${orderItem.status}'. Only items with 'delivered' status can be force-refunded.`,
        400,
      );
    }
  }
  // Restore stock quantity by creating inventory record
  await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_product_variant_id:
        orderItem.ecommerce_mall_product_variant_id,
      quantity_change: orderItem.quantity,
      reason:
        props.body.status === "force_cancelled"
          ? "admin_force_cancel"
          : "admin_force_refund",
      created_at: new Date(),
    },
  });
  // Update order item status and timestamp
  const updatedItem = await MyGlobal.prisma.ecommerce_mall_order_items.update({
    where: { id: props.itemId },
    data: {
      status:
        props.body.status === "force_cancelled" ? "cancelled" : "refunded",
      updated_at: new Date(),
    },
    ...EcommerceMallOrderItemTransformer.select(),
  });
  return await EcommerceMallOrderItemTransformer.transform(updatedItem);
}
