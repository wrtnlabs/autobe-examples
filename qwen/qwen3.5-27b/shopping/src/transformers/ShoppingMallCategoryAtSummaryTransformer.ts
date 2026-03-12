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
  export function select(): Prisma.shopping_mall_categoriesFindManyArgs {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        parent: ShoppingMallCategoryAtSummaryTransformer.select(),
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
      parent: input.parent ? await transform(input.parent) : null,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
