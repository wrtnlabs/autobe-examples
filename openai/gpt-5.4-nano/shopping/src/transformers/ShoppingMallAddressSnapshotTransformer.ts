import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAddressSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_address_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_address_id: true,
        recipient_name: true,
        recipient_phone: true,
        postal_code: true,
        region_line1: true,
        region_line2: true,
        street_address_line1: true,
        street_address_line2: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_address_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAddressSnapshot> {
    return {
      id: input.id,
      shoppingMallAddressId: input.shopping_mall_address_id,
      recipientName: input.recipient_name,
      recipientPhone: input.recipient_phone,
      postalCode: input.postal_code,
      regionLine1: input.region_line1,
      regionLine2: input.region_line2,
      streetAddressLine1: input.street_address_line1,
      streetAddressLine2: input.street_address_line2,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
