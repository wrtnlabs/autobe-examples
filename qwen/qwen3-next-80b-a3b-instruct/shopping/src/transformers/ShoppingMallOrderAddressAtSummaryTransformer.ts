import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderAddressAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        address_line1: true,
        address_line2: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        phone: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderAddress.ISummary> {
    return {
      id: input.id,
      order_id: input.order.id,
    };
  }
}
