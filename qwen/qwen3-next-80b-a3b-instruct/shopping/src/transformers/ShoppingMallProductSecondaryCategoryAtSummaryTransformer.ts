import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductSecondaryCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSecondaryCategory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSecondaryCategoryAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_secondary_categoriesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        product: true,
        category: true,
      },
    } satisfies Prisma.shopping_mall_product_secondary_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSecondaryCategory.ISummary> {
    return {
      id: input.id,
      name: input.category.name,
      description: input.category.description ?? undefined,
    };
  }
}
