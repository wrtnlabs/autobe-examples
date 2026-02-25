import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrier";
import { IShoppingMallShippingCarrierConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingCarrierConfig";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallShippingCarrierAtSummaryTransformer } from "./ShoppingMallShippingCarrierAtSummaryTransformer";

export namespace ShoppingMallShippingCarrierConfigTransformer {
  export type Payload = Prisma.shopping_mall_shipping_carrier_configsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
        carrier: ShoppingMallShippingCarrierAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_shipping_carrier_configsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShippingCarrierConfig> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      carrier: await ShoppingMallShippingCarrierAtSummaryTransformer.transform(
        input.carrier,
      ),
    };
  }
}
