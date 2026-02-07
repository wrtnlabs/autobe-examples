import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceShipmentTransformer } from "../transformers/EcommerceShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminOrdersOrderIdShipmentsId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceShipment> {
  const shipment = await MyGlobal.prisma.ecommerce_shipments.findUnique({
    where: {
      id: props.id,
      ecommerce_order_id: props.orderId,
      deleted_at: null,
    },
    ...EcommerceShipmentTransformer.select(),
  });
  if (!shipment) throw new HttpException("Shipment not found", 404);
  return await EcommerceShipmentTransformer.transform(shipment);
}
