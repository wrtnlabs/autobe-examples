import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallVariantAttributeAtSummaryTransformer {
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
        validator: true,
        order_number: true,
        created_at: true,
        updated_at: true,
        shopping_mall_variant_attribute_values: true,
      },
    } satisfies Prisma.shopping_mall_variant_attributesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantAttribute.ISummary> {
    // Validate and convert type field to ensure it matches DTO enum
    let type: "string" | "number" | "boolean" | "select";
    switch (input.type) {
      case "string":
      case "number":
      case "boolean":
      case "select":
        type = input.type;
        break;
      default:
        // Fallback to default value for type if invalid
        type = "string";
    }
    return {
      id: input.id,
      name: input.name,
      type,
      is_required: true,
      is_customizable: false,
      order: input.order_number,
      is_active: true,
    };
  }
}
