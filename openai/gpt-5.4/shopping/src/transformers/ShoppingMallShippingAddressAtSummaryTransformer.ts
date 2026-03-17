import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShippingAddressAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipping_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        phone_number: true,
        street_address: true,
        city: true,
        state_province: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_shipping_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShippingAddress.ISummary> {
    return {
      id: input.id,
      recipient_name: input.recipient_name,
      phone_number: input.phone_number,
      street_address: input.street_address,
      city: input.city,
      state_province: input.state_province,
      postal_code: input.postal_code,
      country: input.country,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
