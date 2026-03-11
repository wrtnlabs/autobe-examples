import { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategorySnapshotTransformer {
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
        category: true,
      },
    } satisfies Prisma.ecommerce_mall_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategorySnapshot> {
    return {
      id: input.id,
      ecommerce_mall_category_id: input.category.id,
      snapshot_created_at: toISOStringSafe(input.snapshot_created_at),
      name: input.name,
      description: input.description ?? undefined,
      is_leaf: input.is_leaf,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      parent_category_id: input.parent_category_id ?? undefined,
    };
  }
}
