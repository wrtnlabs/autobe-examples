import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShippingCarrierAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipping_carriersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        api_endpoint: true,
        is_enabled: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_shipping_carriersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShippingCarrier.ISummary> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      api_endpoint: input.api_endpoint,
      is_enabled: input.is_enabled,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
