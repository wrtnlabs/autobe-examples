import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallProductTagAtSummaryTransformer } from "./ShoppingMallProductTagAtSummaryTransformer";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallProductTagTransformer {
  export type Payload = Prisma.shopping_mall_product_tagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_product_tagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductTag> {
    return {
      id: input.id,
      productId: input.name,
      tagId: input.name,
      tag: await ShoppingMallProductTagAtSummaryTransformer.transform({
        id: input.id,
        name: input.name,
        created_at: input.created_at,
        updated_at: input.updated_at,
      }),
      product: await ShoppingMallProductAtSummaryTransformer.transform({
        id: input.id,
        name: input.name,
        created_at: input.created_at,
        updated_at: input.updated_at,
      }),
    };
  }
}
