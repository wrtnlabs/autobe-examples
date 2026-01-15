import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReturnShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShippingMethod";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReturnShippingMethodTransformer {
  export type Payload = Prisma.shopping_mall_shipping_methodsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        cost: true,
        estimated_delivery_days: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_shipping_methodsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReturnShippingMethod> {
    const serviceLevel: "standard" | "expedited" | "overnight" =
      input.estimated_delivery_days === 1
        ? "overnight"
        : input.estimated_delivery_days >= 2 &&
            input.estimated_delivery_days <= 3
          ? "expedited"
          : "standard";
    return {
      carrier: typia.assert<
        "FedEx" | "UPS" | "DHL" | "USPS" | "Postal Service"
      >(input.name),
      service_level: serviceLevel,
      cost_coverage: input.cost > 0 ? "customer" : "platform",
      return_label_required:
        input.description?.toLowerCase().includes("label") ?? false,
      return_window_days: input.estimated_delivery_days,
      tracking_enabled: true,
      label_format: "PDF",
    };
  }
}
