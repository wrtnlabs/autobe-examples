import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellersMeShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // Validate all order items exist, belong to seller, and are in 'paid' status
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: props.body.order_item_ids },
      shopping_mall_seller_id: props.seller.id,
      status: "paid",
      deleted_at: null,
    },
    select: { id: true },
  });
  // Check if all requested order items were found and validated
  if (orderItems.length !== props.body.order_item_ids.length) {
    // Check if any items don't belong to this seller
    const allItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        id: { in: props.body.order_item_ids },
        deleted_at: null,
      },
      select: { id: true, shopping_mall_seller_id: true },
    });
    const foreignItems = allItems.filter(
      (item) => item.shopping_mall_seller_id !== props.seller.id,
    );
    if (foreignItems.length > 0) {
      throw new HttpException("Forbidden", 403);
    }
    // Items exist but not in 'paid' status
    throw new HttpException("Order items are not in shippable status", 400);
  }
  // Create shipment and update order items in a transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create shipment with junction records
    const shipment = await tx.shopping_mall_shipments.create({
      data: await ShoppingMallShipmentCollector.collect({
        body: props.body,
        shoppingMallSellers: { id: props.seller.id } as IEntity,
      }),
      ...ShoppingMallShipmentTransformer.select(),
    });
    // Update all order items to 'shipped' status
    await tx.shopping_mall_order_items.updateMany({
      where: {
        id: { in: props.body.order_item_ids },
      },
      data: {
        status: "shipped",
        updated_at: new Date(),
      },
    });
    return shipment;
  });
  return await ShoppingMallShipmentTransformer.transform(result);
}
