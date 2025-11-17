import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
  });

  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_shipments.delete({
    where: { id: props.shipmentId },
  });
}
