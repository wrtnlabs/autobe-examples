import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerAddressAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_customer_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        recipient_phone: true,
        street_address: true,
        city: true,
        state_province: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customerProfile: true,
      },
    } satisfies Prisma.shopping_mall_customer_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerAddress.ISummary> {
    return {
      id: input.id,
      recipient_name: input.recipient_name,
      recipient_phone: input.recipient_phone,
      street_address: input.street_address,
      city: input.city,
      state_province: input.state_province,
      postal_code: input.postal_code,
      country: input.country,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
    } satisfies IShoppingMallCustomerAddress.ISummary;
  }
}
