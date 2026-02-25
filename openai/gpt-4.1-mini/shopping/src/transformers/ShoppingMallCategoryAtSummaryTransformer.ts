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
        deleted_at: true,
        created_at: true,
        updated_at: true,
        parentCategory: {
          select: {
            id: true,
            name: true,
            description: true,
            deleted_at: true,
            created_at: true,
            updated_at: true,
            parentCategory: {
              select: {
                id: true,
                name: true,
                description: true,
                deleted_at: true,
                created_at: true,
                updated_at: true,
                parentCategory: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    deleted_at: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
                subcategories: {
                  select: {
                    id: true,
                  },
                },
              },
            },
            subcategories: {
              select: {
                id: true,
              },
            },
          },
        },
        subcategories: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      parentCategory: input.parentCategory
        ? await ShoppingMallCategoryAtSummaryTransformer.transform(
            input.parentCategory,
          )
        : null,
    };
  }
}
