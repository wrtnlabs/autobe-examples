import { IEcommerceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSnapshotTransformer {
  export type Payload = Prisma.ecommerce_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        snapshot_data: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_snapshotsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceSnapshot> {
    return {
      id: input.id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      snapshot_data: input.snapshot_data,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
