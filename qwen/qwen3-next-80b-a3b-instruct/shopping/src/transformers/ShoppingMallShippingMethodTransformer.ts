import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShippingMethodTransformer {
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
  ): Promise<IShoppingMallShippingMethod> {
    const createdAtDate = new Date(input.created_at);
    const dateStr = createdAtDate.toISOString().split("T")[0].replace(/-/g, "");
    const idSuffix = input.id.substring(input.id.length - 4);
    const code = `SHM-${dateStr}-${idSuffix}`;
    return {
      id: input.id,
      code: code,
      name: input.name,
      description: input.description ?? "Standard shipping method",
      estimated_delivery_days_min: Math.min(input.estimated_delivery_days, 30),
      estimated_delivery_days_max: Math.max(input.estimated_delivery_days, 1),
      cost_formula: input.cost > 0 ? `base_fee + ${input.cost}` : `base_fee`,
      base_fee: input.cost,
      cost_per_weight_unit: undefined,
      is_active: true,
      carrier_id: undefined,
      region_id: undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      last_modified_by: undefined,
      is_deliverable: undefined,
      min_order_value: undefined,
      max_order_weight: undefined,
      taxable: false,
      priority: 5,
      has_tracking: true,
      service_level:
        input.estimated_delivery_days <= 1
          ? "overnight"
          : input.estimated_delivery_days <= 3
            ? "express"
            : input.estimated_delivery_days <= 7
              ? "standard"
              : "economy",
    };
  }
}
