import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.ICreateItem;
}): Promise<IShoppingMallShipment.ISummary> {
  // Check shipment exists and belongs to seller
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        shopping_mall_seller_id: props.seller.id,
      },
    });
  // Validate shipment state allows item additions
  if (shipment.status === "shipped" || shipment.status === "delivered") {
    throw new HttpException(
      `Cannot add items to a ${shipment.status} shipment`,
      400,
    );
  }
  // Validate and collect order items
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: props.body.item_ids },
      shopping_mall_order_seller_profile_snapshot_id:
        (shipment as any).shopping_mall_order_seller_profile_snapshot_id ??
        (shipment as any).shopping_mall_order_seller_profile_snapshot_id,
    },
  });
  if (orderItems.length !== props.body.item_ids.length) {
    throw new HttpException(
      "Some order items not found or don't belong to this seller",
      400,
    );
  }
  // Check if any items are already in another shipment
  const existingShipmentItems =
    await MyGlobal.prisma.shopping_mall_shipment_items.findMany({
      where: {
        shopping_mall_order_item_id: { in: props.body.item_ids },
      },
    });
  if (existingShipmentItems.length > 0) {
    throw new HttpException("Some order items are already in a shipment", 400);
  }
  // Create shipment item records
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_shipment_items.createMany({
    data: props.body.item_ids.map((itemId) => ({
      id: v4(),
      shopping_mall_shipment_id: props.shipmentId,
      shopping_mall_order_item_id: itemId,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    })),
  });
  // Retrieve updated shipment with all items
  const updatedShipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallShipmentAtSummaryTransformer.select(),
    });
  return await ShoppingMallShipmentAtSummaryTransformer.transform(
    updatedShipment,
  );
}
