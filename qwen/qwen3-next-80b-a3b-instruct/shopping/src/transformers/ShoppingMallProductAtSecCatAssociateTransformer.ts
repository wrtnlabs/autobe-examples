import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAtSecCatAssociateTransformer {
  export type Payload =
    Prisma.shopping_mall_product_secondary_categoriesGetPayload<
      ReturnType<typeof select>
    >[];
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
  ): Promise<IShoppingMallProduct.ISecCatAssociate> {
    return {
      category_ids: await ArrayUtil.asyncMap(
        input,
        (record) => record.id satisfies string as string & tags.Format<"uuid">,
      ),
    };
  }
}
