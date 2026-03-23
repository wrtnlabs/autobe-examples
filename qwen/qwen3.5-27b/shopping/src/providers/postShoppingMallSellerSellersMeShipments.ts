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
  // Validate all order items belong to the authenticated seller and are in 'paid' status
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: props.body.order_item_ids },
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      status: true,
    },
  });
  // Check if all requested order items exist
  if (orderItems.length !== props.body.order_item_ids.length) {
    throw new HttpException("One or more order items not found", 404);
  }
  // Validate all order items belong to the authenticated seller
  const unauthorizedItems = orderItems.filter(
    (item) => item.shopping_mall_seller_id !== props.seller.id,
  );
  if (unauthorizedItems.length > 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate all order items are in 'paid' status
  const nonPaidItems = orderItems.filter((item) => item.status !== "paid");
  if (nonPaidItems.length > 0) {
    throw new HttpException(
      "One or more order items are not in shippable state",
      400,
    );
  }
  // Create shipment with order items and update order item status in a transaction
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const shipment = await tx.shopping_mall_shipments.create({
      data: await ShoppingMallShipmentCollector.collect({
        body: props.body,
        shoppingMallSellers: { id: props.seller.id },
      }),
      ...ShoppingMallShipmentTransformer.select(),
    });
    // Update all order items status from 'paid' to 'shipped'
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
  return await ShoppingMallShipmentTransformer.transform(created);
}
