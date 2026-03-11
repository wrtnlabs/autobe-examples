import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerShipmentsShipmentId(props: {
  customer: CustomerPayload;
  shipmentId: string;
  body: IEcommerceMallShipment.IUpdate;
}): Promise<void> {
  // Find shipment by ID
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { ecommerce_mall_seller_id: true },
    });
  // Verify seller ownership - reject if different seller
  if (shipment.ecommerce_mall_seller_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update shipment with optional fields
  await MyGlobal.prisma.ecommerce_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      carrier_name: props.body.carrier_name ?? null,
      tracking_number: props.body.tracking_number ?? null,
      updated_at: new Date().toISOString(),
    },
  });
  // Return void as per operation spec
  return;
}
