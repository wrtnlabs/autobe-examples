import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductCategoryAtSummaryTransformer } from "./ShoppingMallProductCategoryAtSummaryTransformer";

export namespace ShoppingMallProductSubcategoryTransformer {
  export type Payload = Prisma.shopping_mall_product_subcategoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        category: ShoppingMallProductCategoryAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
        products: { select: {} },
      },
    } satisfies Prisma.shopping_mall_product_subcategoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSubcategory> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      category: await ShoppingMallProductCategoryAtSummaryTransformer.transform(
        input.category,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
