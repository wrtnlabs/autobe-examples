import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallShipmentsShoppingMallShipmentId(props: {
  admin: AdminPayload;
  shoppingMallShipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.shoppingMallShipmentId },
  });
  if (!existing) {
    throw new HttpException("Shipment not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_shipments.delete({
    where: { id: props.shoppingMallShipmentId },
  });
}
