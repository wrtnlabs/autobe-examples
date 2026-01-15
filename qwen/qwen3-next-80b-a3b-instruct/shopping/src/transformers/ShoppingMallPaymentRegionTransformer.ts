import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentRegionTransformer {
  export type Payload = Prisma.shopping_mall_payment_regionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        country_code: true,
        paymentMethod: {
          select: {
            name: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_regionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentRegion> {
    return {
      region_code: input.country_code,
      primary_gateway: input.paymentMethod.name,
    };
  }
}
