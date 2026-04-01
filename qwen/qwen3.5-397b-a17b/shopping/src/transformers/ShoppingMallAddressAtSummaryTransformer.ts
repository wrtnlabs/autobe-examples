import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        recipient_phone: true,
        street_address: true,
        city: true,
        state: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
          },
        },
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_address_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAddress.ISummary> {
    return {
      id: input.id,
      recipientName: input.recipient_name,
      recipientPhone: input.recipient_phone,
      streetAddress: input.street_address,
      city: input.city,
      state: input.state,
      postalCode: input.postal_code,
      country: input.country,
      isDefault: input.is_default,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
