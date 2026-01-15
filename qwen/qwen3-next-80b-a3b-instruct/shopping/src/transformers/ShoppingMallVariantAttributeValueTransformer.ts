import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallVariantAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttributeValue";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallVariantAttributeValueTransformer {
  export type Payload = Prisma.shopping_mall_variant_attribute_valuesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        value: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        variantAttribute: {
          select: {
            id: true,
          },
        },
        shopping_mall_variant_compatibility_of_subject_attribu_ef397b36: {
          select: {
            id: true,
          },
        },
        shopping_mall_variant_compatibility_of_object_attribut_664f8f74: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_variant_attribute_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantAttributeValue> {
    return {
      id: input.id,
      value: input.value,
      attribute_id: input.variantAttribute.id,
      display_order: input.display_order,
      is_active: true,
    };
  }
}
