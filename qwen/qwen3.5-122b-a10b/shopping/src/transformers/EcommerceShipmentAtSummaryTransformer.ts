import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

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
        tracking_url: true,
        shipped_at: true,
        delivered_at: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: EcommerceOrderAtSummaryTransformer.select(),
        seller: EcommerceSellerAtSummaryTransformer.select(),
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
      tracking_url: input.tracking_url ?? null,
      shipped_at: input.shipped_at.toISOString(),
      delivered_at: input.delivered_at?.toISOString() ?? null,
      status: input.status,
      order: await EcommerceOrderAtSummaryTransformer.transform(input.order),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceShipment.ISummary;
  }
}
