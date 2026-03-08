import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategoryAtSummaryTransformer {
  // Explicit recursive type for category with parent relation
  type CategoryResult = {
    id: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    parent: CategoryResult | null;
    children: {
      id: string;
    }[];
    products: {
      id: string;
    }[];
  };
  export type Payload = CategoryResult;
  export function select(): Prisma.shopping_mall_categoriesFindManyArgs {
    const recursiveSelect =
      (): Prisma.shopping_mall_categoriesFindManyArgs => ({
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          parent: recursiveSelect(),
          children: { select: { id: true } },
          products: { select: { id: true } },
        },
      });
    return recursiveSelect();
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parent: input.parent ? await transform(input.parent) : null,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
