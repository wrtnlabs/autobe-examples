import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCarrierAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_carriersGetPayload<
    ReturnType<typeof select>
  >;
  // Define interface for service_details JSON structure
  interface ServiceDetailsJSON {
    active: boolean;
    status: string;
    carrier_type: string;
  }
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        service_details: true,
        created_at: true,
        updated_at: true,
        shopping_mall_order_shipments: true,
      },
    } satisfies Prisma.shopping_mall_carriersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCarrier.ISummary> {
    // Parse service_details as JSON if it contains active, status, carrier_type
    let serviceJson: ServiceDetailsJSON | null = null;
    try {
      serviceJson = JSON.parse(input.service_details) as ServiceDetailsJSON;
    } catch (e) {
      // If invalid JSON, keep as null
    }
    return {
      name: input.name,
      service_region: input.service_details, // Fixed: use input.service_details directly, not serviceJson.service_details
      active: serviceJson?.active ?? false,
      status: serviceJson?.status ?? "inactive",
      carrier_type: serviceJson?.carrier_type ?? "national",
    };
  }
}
