import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        ordering: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: true,
        recursive: true,
        shopping_mall_products: true,
        shopping_mall_product_secondary_categories: true,
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      slug: input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      parent_id: input.parent?.id ?? "00000000-0000-0000-0000-000000000000",
      level: input.parent ? 2 : 1,
      order: input.ordering,
      is_active: input.deleted_at === null,
      created_at: input.created_at.toISOString(),
    };
  }
}
