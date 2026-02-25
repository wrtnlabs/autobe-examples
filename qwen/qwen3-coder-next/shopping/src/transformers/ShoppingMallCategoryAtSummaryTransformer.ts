import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

export namespace ShoppingMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sellerAssignments: {
          select: { id: true },
        },
        products: {
          select: { id: true },
        },
        productSnapshots: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory.ISummary> {
    const parent = input.parent_category_id
      ? await ShoppingMallCategoryAtSummaryTransformer.transform({
          id: input.parent_category_id,
          name: input.name,
          description: input.description,
          created_at: input.created_at,
          updated_at: input.updated_at,
          deleted_at: input.deleted_at,
          parent_category_id: input.parent_category_id,
          sellerAssignments: [],
          products: [],
          productSnapshots: [],
        })
      : null;
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parent,
      subcategory_count: input.products.length,
    };
  }
}
