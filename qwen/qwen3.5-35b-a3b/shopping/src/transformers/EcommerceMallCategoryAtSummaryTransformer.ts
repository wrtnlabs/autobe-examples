import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_categoriesGetPayload<{
    select: {
      id: true;
      name: true;
      description: true;
      is_leaf: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      parent: {
        select: {
          id: true;
          name: true;
          is_leaf: true;
          created_at: true;
          updated_at: true;
          deleted_at: true;
        };
      };
      children: true;
      snapshots: true;
      products: true;
      productSnapshots: true;
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        is_leaf: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            is_leaf: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        children: true,
        snapshots: true,
        products: true,
        productSnapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      is_leaf: input.is_leaf,
      parent: input.parent
        ? {
            id: input.parent.id,
            name: input.parent.name,
            is_leaf: input.parent.is_leaf,
            created_at: input.parent.created_at.toISOString(),
            updated_at: input.parent.updated_at.toISOString(),
            deleted_at: input.parent.deleted_at?.toISOString() ?? null,
          }
        : undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
