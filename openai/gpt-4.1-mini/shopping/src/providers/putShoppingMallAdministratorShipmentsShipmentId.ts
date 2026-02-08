import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function putShoppingMallAdministratorShipmentsShipmentId(props: {
  administrator: AdministratorPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: { id: props.shipmentId, deleted_at: null },
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: { updated_at: toISOStringSafe(new Date()) },
  });
  return {};
}
