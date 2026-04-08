import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";
import { EcommerceShipmentItemTransformer } from "./EcommerceShipmentItemTransformer";

export namespace EcommerceShipmentTransformer {
  export type Payload = Prisma.ecommerce_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        carrier_name: true,
        tracking_number: true,
        tracking_url: true,
        shipped_at: true,
        delivered_at: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: EcommerceOrderAtSummaryTransformer.select(),
        seller: EcommerceSellerAtSummaryTransformer.select(),
        shipmentItems: EcommerceShipmentItemTransformer.select(),
      },
    } satisfies Prisma.ecommerce_shipmentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceShipment> {
    return {
      carrier_name: input.carrier_name,
      created_at: input.created_at.toISOString(),
      delivered_at: input.delivered_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      id: input.id,
      order: await EcommerceOrderAtSummaryTransformer.transform(input.order),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      shipped_at: input.shipped_at.toISOString(),
      shipment_items: await ArrayUtil.asyncMap(
        input.shipmentItems,
        EcommerceShipmentItemTransformer.transform,
      ),
      status: input.status,
      tracking_number: input.tracking_number,
      tracking_url: input.tracking_url ?? undefined,
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceShipment;
  }
}
