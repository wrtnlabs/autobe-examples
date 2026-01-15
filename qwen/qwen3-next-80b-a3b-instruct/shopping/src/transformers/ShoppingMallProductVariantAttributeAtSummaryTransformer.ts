import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantAttributeAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_attributesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        variant: {
          select: {
            name: true,
            type: true,
            categoryId: true,
            priority: true,
            description: true,
            required: true,
            filterable: true,
            sortable: true,
            minValue: true,
            maxValue: true,
            stepValue: true,
            deprecated: true,
            generated: true,
            tags: true,
          },
        },
        attributeValue: {
          select: {
            value: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_variant_attributesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantAttribute.ISummary> {
    return {
      id: input.id,
      name: input.variant.name,
      type: input.variant.type,
      status: input.attributeValue.value as any satisfies
        | "active"
        | "inactive"
        | "deprecated" as "active" | "inactive" | "deprecated",
      category_id: input.variant.categoryId,
      priority: input.variant.priority,
      description: input.variant.description,
      is_required: input.variant.required,
      is_filterable: input.variant.filterable,
      is_sortable: input.variant.sortable,
      min_value: input.variant.minValue,
      max_value: input.variant.maxValue,
      step_value: input.variant.stepValue,
      is_deprecated: input.variant.deprecated,
      system_generated: input.variant.generated,
      tags: input.variant.tags,
    };
  }
}
