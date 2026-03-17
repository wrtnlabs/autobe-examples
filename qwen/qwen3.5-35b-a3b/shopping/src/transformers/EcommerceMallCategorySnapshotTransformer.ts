import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCategoryAtSummaryTransformer } from "./EcommerceMallCategoryAtSummaryTransformer";

export namespace EcommerceMallCategorySnapshotTransformer {
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
        snapshot_id: true,
        category: EcommerceMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_category_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategorySnapshot> {
    return {
      id: input.id,
      snapshot_id: input.snapshot_id,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      slug: input.slug,
      parent_id: input.parent_id ?? null,
      level: input.level,
      sort_order: input.sort_order,
      is_active: input.is_active,
      created_at: toISOStringSafe(input.created_at),
      category: await EcommerceMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
    };
  }
}
