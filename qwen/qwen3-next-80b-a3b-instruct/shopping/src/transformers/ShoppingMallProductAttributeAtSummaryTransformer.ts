import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAttributeAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_attributesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        sort_order: true,
        shopping_mall_product_attribute_values: {
          select: {
            id: true,
            value: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_attributesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductAttribute.ISummary> {
    return {
      id: input.id,
      name: input.name,
      type: "text", // Default value since DB does not have type field
      is_required: false, // Default value since DB does not have is_required field
      sort_order: input.sort_order,
      is_deprecated: undefined, // Optional field, set to undefined since DB does not have field
      description: input.description,
    };
  }
}
