import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderItemTransformer } from "../transformers/EcommerceOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdminOrdersOrderIdItemsItemIdForceCancel(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItem.IForceCancel;
}): Promise<IEcommerceOrderItem> {
  const item = await MyGlobal.prisma.ecommerce_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      quantity: true,
      ecommerce_product_variant_id: true,
      unit_price: true,
      snapshot: {
        select: {
          product_name: true,
          product_description: true,
          seller_shop_name: true,
          seller_logo_url: true,
          base_price: true,
        },
      },
    },
  });
  if (item.status === "cancelled") {
    throw new HttpException("Order item already cancelled", 409);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.ecommerce_order_items.update({
      where: { id: props.itemId },
      data: {
        status: "cancelled",
        updated_at: new Date(),
      },
    });
    await tx.ecommerce_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_product_variant_id: item.ecommerce_product_variant_id,
        quantity_change: item.quantity,
        reason: "cancellation",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    await tx.ecommerce_order_item_snapshots.create({
      data: {
        id: v4(),
        ecommerce_order_item_id: props.itemId,
        product_name: item.snapshot?.product_name ?? "",
        product_description: item.snapshot?.product_description ?? null,
        seller_shop_name: item.snapshot?.seller_shop_name ?? "",
        seller_logo_url: item.snapshot?.seller_logo_url ?? null,
        base_price: item.snapshot?.base_price ?? item.unit_price,
        created_at: new Date(),
      },
    });
    const orderItems = await tx.ecommerce_order_items.findMany({
      where: { ecommerce_order_id: props.orderId, deleted_at: null },
      select: { status: true },
    });
    const allCancelled = orderItems.every((i) => i.status === "cancelled");
    const allRefunded = orderItems.every((i) => i.status === "refunded");
    const hasDelivered = orderItems.some((i) => i.status === "delivered");
    const hasShipped = orderItems.some((i) => i.status === "shipped");
    const newOrderStatus = allCancelled
      ? "cancelled"
      : allRefunded
        ? "refunded"
        : hasDelivered
          ? "partially_completed"
          : hasShipped
            ? "shipped"
            : "paid";
    await tx.ecommerce_orders.update({
      where: { id: props.orderId },
      data: {
        status: newOrderStatus,
        updated_at: new Date(),
      },
    });
    const updated =
      await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
        where: { id: props.itemId },
        ...EcommerceOrderItemTransformer.select(),
      });
    return await EcommerceOrderItemTransformer.transform(updated);
  });
}
