import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSnapshotPayloadTransformer {
  export type Payload = Prisma.shopping_mall_snapshot_payloadsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_snapshot_id: true,
        payload: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_snapshot_payloadsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSnapshotPayload> {
    return {
      id: input.id,
      shopping_mall_snapshot_id: input.shopping_mall_snapshot_id,
      payload: input.payload,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
