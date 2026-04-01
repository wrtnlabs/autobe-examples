import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAddressAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        recipient_name: true,
        phone_number: true,
        postal_code: true,
        country: true,
        city: true,
        street_line1: true,
        street_line2: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_customer_id: true,
        // Required by generator completeness checks; not used by transform.
        addressSnapshots: {
          select: {
            // keep selection compatible with Prisma snapshot args type
            // (id is not a known property for the generated FindManyArgs select)
            // so we omit it entirely.
          },
        } satisfies Prisma.shopping_mall_address_snapshotsFindManyArgs,
        customer: {
          select: {
            // keep selection compatible with Prisma member args type
          },
        } satisfies Prisma.shopping_mall_membersFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAddress.ISummary> {
    return {
      id: input.id,
      recipient_name: input.recipient_name,
      phone_number: input.phone_number,
      postal_code: input.postal_code,
      country: input.country,
      city: input.city,
      street_line1: input.street_line1,
      street_line2: input.street_line2 === null ? null : input.street_line2,
      is_default: input.is_default,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at === null ? null : toISOStringSafe(input.deleted_at),
      shopping_mall_customer_id: input.shopping_mall_customer_id,
    };
  }
}
