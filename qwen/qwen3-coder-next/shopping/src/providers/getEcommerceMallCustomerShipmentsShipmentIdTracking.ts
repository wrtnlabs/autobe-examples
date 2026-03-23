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

export async function getEcommerceMallCustomerShipmentsShipmentIdTracking(props: {
  customer: CustomerPayload;
  shipmentId: string;
}): Promise<IEcommerceMallShipment.ITracking> {
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        deleted_at: null,
        OR: [
          {
            ecommerce_mall_seller_id: props.customer.id,
          },
          {
            order: {
              customer_id: props.customer.id,
            },
          },
        ],
      },
      select: {
        carrier_name: true,
        tracking_number: true,
      },
    });
  return {
    carrier_name: shipment.carrier_name ?? undefined,
    tracking_number: shipment.tracking_number ?? undefined,
  };
}
