import { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategorySnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_category_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_created_at: true,
        name: true,
        description: true,
        is_leaf: true,
        created_at: true,
        updated_at: true,
        parent_category_id: true,
        category: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategorySnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      name: input.name,
      description: input.description,
      is_leaf: input.is_leaf,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      parent_category_id: input.parent_category_id ?? null,
    };
  }
}
