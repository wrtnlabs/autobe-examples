import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallVariantAttributeTransformer {
  export type Payload = Prisma.shopping_mall_variant_attributesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        isRequired: true,
        isFilterable: true,
        isSearchable: true,
        validator: true,
        orderNumber: true,
        createdAt: true,
        updatedAt: true,
        shopping_mall_variant_attribute_values: {
          select: {
            id: true,
            value: true,
            displayOrder: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_variant_attributesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantAttribute> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      type: input.type as "number" | "boolean" | "date" | "text" | "select",
      is_required: input.isRequired,
      is_filterable: input.isFilterable,
      is_searchable: input.isSearchable,
      display_order: input.orderNumber,
      validation_rules: input.validator
        ? JSON.parse(input.validator)
        : undefined,
    };
  }
}
