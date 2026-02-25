import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";

export namespace EcommerceShipmentAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        status: true,
        shipment_date: true,
        expected_delivery_date: true,
        created_at: true,
        order: EcommerceOrderAtSummaryTransformer.select(),
        updated_at: true,
        deleted_at: true,
        shipmentItems: {
          select: {},
        },
      },
    } satisfies Prisma.ecommerce_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceShipment.ISummary> {
    return {
      id: input.id,
      carrier_name: input.carrier_name,
      tracking_number: input.tracking_number,
      status: input.status,
      shipment_date: toISOStringSafe(input.shipment_date),
      expected_delivery_date: toISOStringSafe(input.expected_delivery_date),
      created_at: toISOStringSafe(input.created_at),
      order: await EcommerceOrderAtSummaryTransformer.transform(input.order),
    };
  }
}
