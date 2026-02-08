import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentItemCollector } from "../collectors/ShoppingMallShipmentItemCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipmentItems(props: {
  seller: SellerPayload;
  body: IShoppingMallShipmentItem.ICreate;
}): Promise<IShoppingMallShipmentItem> {
  const shipmentId = (props.body as any).shipment_id as string &
    tags.Format<"uuid">;
  const orderItemId = (props.body as any).order_item_id as string &
    tags.Format<"uuid">;
  const shipmentExists =
    await MyGlobal.prisma.shopping_mall_shipments.findUnique({
      where: { id: shipmentId },
      select: { id: true },
    });
  if (!shipmentExists) throw new HttpException("Shipment not found", 404);
  const orderItemExists =
    await MyGlobal.prisma.shopping_mall_order_items.findUnique({
      where: { id: orderItemId },
      select: { id: true },
    });
  if (!orderItemExists) throw new HttpException("Order item not found", 404);
  const data = await ShoppingMallShipmentItemCollector.collect({
    body: props.body,
    shipmentId,
    orderItemId,
  });
  try {
    const created = await MyGlobal.prisma.$transaction(async (prisma) => {
      return await prisma.shopping_mall_shipment_items.create({ data });
    });
    const now = toISOStringSafe(new Date());
    await MyGlobal.prisma.shopping_mall_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: props.seller.id,
        actor_type: "seller",
        event_type: "create-shipment-item",
        description: JSON.stringify({
          shipment_id: shipmentId,
          order_item_id: orderItemId,
        }),
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      shipment_id: created.shipment_id,
      order_item_id: created.order_item_id,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate shipment item: shipment_id and order_item_id must be unique",
        409,
      );
    }
    throw e;
  }
}
