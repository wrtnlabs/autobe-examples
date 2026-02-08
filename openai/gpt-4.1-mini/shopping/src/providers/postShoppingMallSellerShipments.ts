import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  const orderItemIds = (
    props.body as unknown as {
      order_item_ids: (string & tags.Format<"uuid">)[];
    }
  ).order_item_ids;
  if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
    throw new HttpException("Order item IDs must be a non-empty array", 400);
  }
  const now = toISOStringSafe(new Date());
  const validOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        id: { in: orderItemIds },
        status: { in: ["paid", "processing"] },
        deleted_at: null,
        order: {
          seller: { id: props.seller.id },
          deleted_at: null,
        },
      },
    });
  if (validOrderItems.length !== orderItemIds.length) {
    throw new HttpException(
      "Some order items are invalid or do not belong to the seller",
      400,
    );
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const shipmentData = await ShoppingMallShipmentCollector.collect({
      body: props.body,
      seller: props.seller,
    });
    const createdShipment = await tx.shopping_mall_shipments.create({
      data: shipmentData,
    });
    for (const orderItem of validOrderItems) {
      await tx.shopping_mall_shipment_items.create({
        data: {
          id: v4(),
          shipment: { connect: { id: createdShipment.id } },
          orderItem: { connect: { id: orderItem.id } },
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
      await tx.shopping_mall_shipment_order_items.create({
        data: {
          id: v4(),
          shipment: { connect: { id: createdShipment.id } },
          orderItem: { connect: { id: orderItem.id } },
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    const fullShipment = await tx.shopping_mall_shipments.findUnique({
      where: { id: createdShipment.id },
      include: { shipmentItems: true, shipmentOrderItems: true },
    });
    if (!fullShipment) {
      throw new HttpException("Failed to retrieve created shipment", 500);
    }
    return fullShipment;
  });
}
