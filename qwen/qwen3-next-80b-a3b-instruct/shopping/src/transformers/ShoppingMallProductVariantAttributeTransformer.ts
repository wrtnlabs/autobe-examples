import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallVariantAttributeValueTransformer } from "./ShoppingMallVariantAttributeValueTransformer";

export namespace ShoppingMallProductVariantAttributeTransformer {
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
            displayName: true,
            description: true,
            attributeType: true,
            isRequired: true,
            isFilterable: true,
            isComparative: true,
            sortOrder: true,
            status: true,
          },
        },
        attributeValue: {
          select: {
            id: true,
            display_order: true,
            value: true,
            deleted_at: true,
            variantAttribute: {
              select: { id: true },
            },
            shopping_mall_variant_compatibility_of_subject_attribu_ef397b36: {
              select: { id: true },
            },
            shopping_mall_variant_compatibility_of_object_attribut_664f8f74: {
              select: { id: true },
            },
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_variant_attributesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantAttribute> {
    return {
      id: input.id,
      name: input.variant?.name || "",
      displayName: input.variant?.displayName || "",
      description: input.variant?.description ?? undefined,
      attributeType: input.variant?.attributeType || "",
      isRequired: input.variant?.isRequired || false,
      isFilterable: input.variant?.isFilterable || false,
      isComparative: input.variant?.isComparative || false,
      sortOrder: input.variant?.sortOrder || 0,
      status: input.variant?.status || "active",
      values: await ShoppingMallVariantAttributeValueTransformer.transform(
        input.attributeValue,
      ),
    };
  }
}
