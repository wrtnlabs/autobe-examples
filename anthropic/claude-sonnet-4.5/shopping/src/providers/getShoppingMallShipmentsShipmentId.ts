import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

export async function getShoppingMallShipmentsShipmentId(props: {
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  const { shipmentId } = props;

  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: shipmentId },
      select: {
        id: true,
        tracking_number: true,
      },
    });

  return {
    id: shipment.id as string & tags.Format<"uuid">,
    tracking_number: shipment.tracking_number,
  };
}
