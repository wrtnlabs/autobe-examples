import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductSecondaryCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSecondaryCategory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSecondaryCategoryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_secondary_categoriesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        product: {
          select: {
            id: true,
          },
        },
        category: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_secondary_categoriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSecondaryCategory> {
    return {
      product_id: input.product.id,
      secondary_category_id: input.category.id,
    };
  }
}
