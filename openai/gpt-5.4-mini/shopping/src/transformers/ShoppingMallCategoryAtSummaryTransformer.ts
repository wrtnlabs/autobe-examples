import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategoryAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_categoriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        parent: {
          select: {
            id: true,
            parent: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory.ISummary> {
    return {
      id: input.id,
      parent: input.parent
        ? {
            id: input.parent.id,
            parent: input.parent.parent
              ? {
                  id: input.parent.parent.id,
                  parent: null,
                  name: input.parent.parent.name,
                  description: input.parent.parent.description,
                  created_at: input.parent.parent.created_at.toISOString(),
                  updated_at: input.parent.parent.updated_at.toISOString(),
                  deleted_at:
                    input.parent.parent.deleted_at?.toISOString() ?? null,
                }
              : null,
            name: input.parent.name,
            description: input.parent.description,
            created_at: input.parent.created_at.toISOString(),
            updated_at: input.parent.updated_at.toISOString(),
            deleted_at: input.parent.deleted_at?.toISOString() ?? null,
          }
        : null,
      name: input.name,
      description: input.description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
