import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAttributeValueTransformer {
  export type Payload = Prisma.shopping_mall_product_attribute_valuesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        value: true,
        description: true,
        created_at: true,
        updated_at: true,
        attribute: {
          select: {
            id: true, // Only select id since that's the only field needed for DTO
            name: true, // Keep name in case needed later
          },
        },
        shopping_mall_product_variant_attributes: {
          select: {
            id: true,
            variant: true, // Fix: was variant_id, corrected to variant according to schema
            product_attribute_value_id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_attribute_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductAttributeValue> {
    return {
      id: input.id,
      value: input.value,
      display_order: 0, // Default value as field doesn't exist in schema
      created_at: toISOStringSafe(input.created_at),
      attribute_id: input.attribute.id,
      displayName: input.description ?? undefined,
      priceAdjustment: undefined, // Default value as field doesn't exist in schema
      isActive: true, // Default value as field doesn't exist in schema
    };
  }
}
