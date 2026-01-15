import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCarrierTransformer {
  export type Payload = Prisma.shopping_mall_carriersGetPayload<
    ReturnType<typeof select>
  >;
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
  ): Promise<IShoppingMallCarrier> {
    return {
      carrier_name: input.name,
      carrier_code: input.service_details,
      description: undefined,
      delivery_enabled: true,
      capacity_range: "0-100kg, 0-2m³",
      service_areas: [],
      currency_supported: [],
      api_integration: "none",
      api_endpoint: "",
      api_auth_method: "none",
      default_delivery_days: 5,
      status: "active",
      tenant_id: "",
      priority: 0,
      documentation_url: "",
      notes: undefined,
    };
  }
}
