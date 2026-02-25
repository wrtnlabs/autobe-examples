import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderAddressAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        phone: true,
        street: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
      },
    } satisfies Prisma.shopping_mall_order_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderAddress.ISummary> {
    return {
      id: input.id,
      recipientName: input.recipient_name,
      phone: input.phone,
      street: input.street,
      city: input.city,
      state: input.state,
      postalCode: input.postal_code,
      country: input.country,
    };
  }
}
