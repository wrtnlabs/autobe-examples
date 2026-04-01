import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAddressTransformer {
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
        customer: true,
        addressSnapshots: true,
      },
    } satisfies Prisma.shopping_mall_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAddress> {
    return {
      id: input.id,
      recipientName: input.recipient_name,
      phoneNumber: input.phone_number,
      postalCode: input.postal_code,
      country: input.country,
      city: input.city,
      streetLine1: input.street_line1,
      streetLine2: input.street_line2 ?? null,
      isDefault: input.is_default,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
