import { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";

export namespace EcommerceAddressTransformer {
  export type Payload = Prisma.ecommerce_addressesGetPayload<
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
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_addressesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceAddress> {
    return {
      id: input.id,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      recipient_name: input.recipient_name,
      phone_number: input.phone_number,
      street_address: input.street_address,
      city: input.city,
      state: input.state ?? null,
      postal_code: input.postal_code,
      country: input.country,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceAddress;
  }
}
