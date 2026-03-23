import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAddressTransformer {
  export type Payload = Prisma.ecommerce_mall_addressesGetPayload<
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
        customerProfile: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs,
        user: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        orders: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAddress> {
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
