import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductCompatible } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCompatible";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallProductCompatibleTransformer {
  export type Payload = Prisma.shopping_mall_variant_compatibilityGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        notes: true,
        subjectAttributeValue: ShoppingMallProductAtSummaryTransformer.select(),
        objectAttributeValue: ShoppingMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_variant_compatibilityFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductCompatible> {
    return {
      id: input.id,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.subjectAttributeValue,
      ),
      compatible_product:
        await ShoppingMallProductAtSummaryTransformer.transform(
          input.objectAttributeValue,
        ),
      description: input.notes ?? "",
    };
  }
}
