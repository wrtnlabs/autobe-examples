import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallVariantCompatibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantCompatibility";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallVariantCompatibilityTransformer {
  export type Payload = Prisma.shopping_mall_variant_compatibilityGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        is_active: true,
        notes: true,
        subjectAttributeValue: {
          select: {
            attribute_id: true,
            value: true,
          },
        },
        objectAttributeValue: {
          select: {
            attribute_id: true,
            value: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_variant_compatibilityFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantCompatibility> {
    return {
      from_attribute_id: input.subjectAttributeValue.attribute_id,
      from_attribute_value: input.subjectAttributeValue.value,
      to_attribute_id: input.objectAttributeValue.attribute_id,
      to_attribute_value: input.objectAttributeValue.value,
      description: input.notes ?? undefined,
    };
  }
}
