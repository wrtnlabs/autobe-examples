import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

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
        created_at: true,
        updated_at: true,
        parent: ShoppingMallCategoryAtSummaryTransformer.select(),
        children: ShoppingMallCategoryAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory> {
    return {
      id: input.id,
      parent_id: input.parent?.id ?? null,
      parent: input.parent
        ? await ShoppingMallCategoryAtSummaryTransformer.transform(input.parent)
        : null,
      name: input.name,
      description: input.description,
      children: await ArrayUtil.asyncMap(
        input.children,
        ShoppingMallCategoryAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
