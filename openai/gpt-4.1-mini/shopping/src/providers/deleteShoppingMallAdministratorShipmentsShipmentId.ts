import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdministratorShipmentsShipmentId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if shipment exists
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shipmentId },
    select: { id: true },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  // Delete shipment
  await MyGlobal.prisma.shopping_mall_shipments.delete({
    where: { id: props.shipmentId },
  });
}
