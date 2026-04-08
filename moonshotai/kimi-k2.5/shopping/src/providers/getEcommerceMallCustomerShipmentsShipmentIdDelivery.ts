import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentDeliveryTransformer } from "../transformers/EcommerceMallShipmentDeliveryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerShipmentsShipmentIdDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipmentDelivery> {
  // Get shipment to find order_id
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        order_id: true,
      },
    });
  // Fetch order to verify customer ownership
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: shipment.order_id },
    select: { customer_id: true },
  });
  // Authorization: verify shipment belongs to customer's order
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find delivery record using transformer select
  const delivery =
    await MyGlobal.prisma.ecommerce_mall_shipment_deliveries.findUniqueOrThrow({
      where: { shipment_id: props.shipmentId },
      ...EcommerceMallShipmentDeliveryTransformer.select(),
    });
  return await EcommerceMallShipmentDeliveryTransformer.transform(delivery);
}
