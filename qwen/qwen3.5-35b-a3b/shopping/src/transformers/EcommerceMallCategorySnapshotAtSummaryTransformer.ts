import { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategorySnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_category_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
        },
      },
    } satisfies Prisma.ecommerce_mall_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategorySnapshot.ISummary> {
    return {
      id: input.id,
      snapshotId: input.category.id,
      code: input.code,
      name: input.name,
      description: input.description ?? undefined,
      slug: input.slug,
      parentId: input.parent_id,
      level: input.level,
      sortOrder: input.sort_order,
      isActive: input.is_active,
      createdAt: input.created_at.toISOString(),
    };
  }
}
