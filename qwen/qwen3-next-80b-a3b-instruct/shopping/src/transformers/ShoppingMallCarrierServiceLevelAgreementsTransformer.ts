import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCarrierServiceLevelAgreements } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrierServiceLevelAgreements";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCarrierServiceLevelAgreementsTransformer {
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
        shopping_mall_order_shipments: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_carriersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCarrierServiceLevelAgreements> {
    // Default metric values - data not available in database schema
    const on_time_delivery_rate = 0.0;
    const average_transit_time = 0.0;
    const damage_rate = 0.0;
    const customer_satisfaction_score = 0.0;
    // String-to-enum mapping heuristic for status
    let status: "excellent" | "good" | "fair" | "poor" | "inactive" =
      "inactive";
    if (input.service_details) {
      if (input.service_details.toLowerCase().includes("premium"))
        status = "excellent";
      else if (input.service_details.toLowerCase().includes("reliable"))
        status = "good";
      else if (input.service_details.toLowerCase().includes("standard"))
        status = "fair";
      else if (input.service_details.toLowerCase().includes("slow"))
        status = "poor";
    }
    return {
      on_time_delivery_rate,
      average_transit_time,
      damage_rate,
      customer_satisfaction_score,
      status,
    };
  }
}
