import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerShipmentItemsShipmentItemId(props: {
  seller: SellerPayload;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_shipment_items.findUniqueOrThrow({
      where: { id: props.shipmentItemId },
      select: { shipment_id: true },
    });
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: shipmentItem.shipment_id },
      select: { seller_id: true },
    });
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_shipment_items.delete({
    where: { id: props.shipmentItemId },
  });
}
