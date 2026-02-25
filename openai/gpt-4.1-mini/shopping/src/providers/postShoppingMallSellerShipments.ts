import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  if (!props.body.orderItemIds || props.body.orderItemIds.length === 0) {
    throw new HttpException("Order item IDs must not be empty.", 400);
  }
  // Validate ownership and status of order items
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: props.body.orderItemIds },
      status: "paid",
      deleted_at: null,
      order: {
        seller: { id: props.seller.id },
      },
    },
    select: { id: true },
  });
  if (orderItems.length !== props.body.orderItemIds.length) {
    throw new HttpException(
      "One or more order items are invalid or not owned by authenticated seller.",
      403,
    );
  }
  // Use transaction to create shipment and update order items status atomically
  const shipment = await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallShipmentCollector.collect({
      body: props.body,
      seller: props.seller,
    });
    const createdShipment = await tx.shopping_mall_shipments.create({
      data,
      ...ShoppingMallShipmentTransformer.select(),
    });
    await tx.shopping_mall_order_items.updateMany({
      where: { id: { in: props.body.orderItemIds } },
      data: { status: "shipped" },
    });
    return createdShipment;
  });
  return await ShoppingMallShipmentTransformer.transform(shipment);
}
