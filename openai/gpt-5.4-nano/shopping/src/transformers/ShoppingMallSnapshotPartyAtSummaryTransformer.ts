import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSnapshotPartyAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_snapshot_partiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_snapshot_id: true,
        party_type: true,
        party_id: true,
        can_view: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshot: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_snapshot_partiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSnapshotParty.ISummary> {
    return {
      id: input.id,
      shopping_mall_snapshot_id: input.shopping_mall_snapshot_id,
      party_type: input.party_type,
      party_id: input.party_id,
      can_view: input.can_view,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
