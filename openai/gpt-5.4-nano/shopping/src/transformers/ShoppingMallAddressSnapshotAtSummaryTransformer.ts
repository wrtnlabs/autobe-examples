import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAddressSnapshotAtSummaryTransformer {
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
  ): Promise<IShoppingMallAddressSnapshot.ISummary> {
    return {
      id: input.id,
      shopping_mall_address_id: input.shopping_mall_address_id,
      recipient_name: input.recipient_name,
      recipient_phone: input.recipient_phone,
      postal_code: input.postal_code,
      region_line1: input.region_line1,
      region_line2: input.region_line2,
      street_address_line1: input.street_address_line1,
      street_address_line2: input.street_address_line2,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
