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
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
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
      parent:
        input.parent != null
          ? ({
              id: input.parent.id,
              name: input.parent.name,
              description: input.parent.description,
              parent: null,
              created_at: input.parent.created_at.toISOString(),
              updated_at: input.parent.updated_at.toISOString(),
              deleted_at:
                input.parent.deleted_at != null
                  ? input.parent.deleted_at.toISOString()
                  : null,
            } satisfies IShoppingMallCategory.ISummary)
          : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at:
        input.deleted_at != null ? input.deleted_at.toISOString() : null,
    };
  }
}
