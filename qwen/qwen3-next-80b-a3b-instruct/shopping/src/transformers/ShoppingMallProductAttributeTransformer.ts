import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAttributeTransformer {
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
        type: true,
        is_required: true,
        is_filterable: true,
        is_comparable: true,
        shopping_mall_product_attribute_values: {
          select: {
            id: true,
            value: true,
            attribute: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_attributesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductAttribute> {
    return {
      id: input.id,
      name: input.name,
      label: input.description,
      displayOrder: input.sort_order,
      type: input.type,
      isRequired: input.is_required,
      isFilterable: input.is_filterable,
      isComparable: input.is_comparable,
    };
  }
}
