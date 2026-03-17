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
        snapshot_id: true,
        code: true,
        name: true,
        description: true,
        slug: true,
        parent_id: true,
        level: true,
        sort_order: true,
        is_active: true,
        created_at: true,
        category: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategorySnapshot.ISummary> {
    return {
      id: input.id,
      snapshotId: input.snapshot_id,
      code: input.code,
      name: input.name,
      description: input.description ?? undefined,
      slug: input.slug,
      parentId: input.parent_id ?? null,
      level: input.level,
      sortOrder: input.sort_order,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
    } satisfies IEcommerceMallCategorySnapshot.ISummary;
  }
}
