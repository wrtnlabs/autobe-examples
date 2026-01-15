import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShippingMethodAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipping_methodsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        cost: true,
        estimated_delivery_days: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_shipping_methodsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShippingMethod.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      carrier_id: undefined,
      service_level: undefined,
      is_active: undefined,
      estimated_days_min: input.estimated_delivery_days,
      estimated_days_max: input.estimated_delivery_days,
      base_cost: input.cost,
      default_region: undefined,
      is_free_threshold_enabled: undefined,
      free_shipping_threshold: undefined,
      is_multi_city_enabled: undefined,
      has_signature_required: undefined,
      has_dimensional_weight: undefined,
      recommended_for: undefined,
      max_weight_lbs: undefined,
      max_dimensions_inches: undefined,
      taxable: undefined,
      tracking_link_template: undefined,
      priority_rank: undefined,
      insured_value_limit: undefined,
    };
  }
}
