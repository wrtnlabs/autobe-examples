import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallShippingAddressAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_shipping_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        phone: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        orders: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_shipping_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShippingAddress.ISummary> {
    return {
      id: input.id,
      recipient_name: input.recipient_name,
      phone: input.phone,
      street_address: input.street_address,
      city: input.city,
      state: input.state,
      postal_code: input.postal_code,
      country: input.country,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}
