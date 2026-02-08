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

export async function deleteShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });
  if (!shipment || shipment.seller_id !== props.seller.id) {
    throw new HttpException("Shipment not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_shipments.delete({
    where: { id: props.shipmentId },
  });
}
