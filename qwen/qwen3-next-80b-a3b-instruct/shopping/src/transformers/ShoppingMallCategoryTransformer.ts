import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategoryTransformer {
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
  ): Promise<IShoppingMallCategory> {
    return {
      id: input.id,
      code: "", // No source in schema - DTO requires it, set to empty string as safe default
      name: input.name,
      description: input.description ?? undefined,
      parentId: input.parent?.id ?? undefined,
      isDisabled: undefined, // No source in schema - DTO allows undefined
    };
  }
}
