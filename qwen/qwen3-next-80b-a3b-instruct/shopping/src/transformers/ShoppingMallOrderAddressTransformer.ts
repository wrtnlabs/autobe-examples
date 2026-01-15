import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderAddressTransformer {
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
        order: true,
      },
    } satisfies Prisma.shopping_mall_order_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderAddress> {
    return {
      recipient_name: input.address_line1,
      phone: input.phone,
      street_address: input.address_line1,
      city: input.city,
      state: input.state,
      postal_code: input.postal_code,
      country: input.country,
    };
  }
}
