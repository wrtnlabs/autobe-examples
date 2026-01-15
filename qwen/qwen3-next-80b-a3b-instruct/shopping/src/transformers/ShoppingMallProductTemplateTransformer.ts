import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTemplate";
import { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallProductVariantAttributeTransformer } from "./ShoppingMallProductVariantAttributeTransformer";

export namespace ShoppingMallProductTemplateTransformer {
  export type Payload = Prisma.shopping_mall_variant_templatesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        created_by_admin_id: true,
        productVariant: {
          select: {
            id: true,
            display_name: true,
            description: true,
            attribute_type: true,
            is_required: true,
            is_filterable: true,
            is_comparative: true,
            sort_order: true,
            status: true,
            category_id: true,
            is_active: true,
            is_visible_to_customers: true,
            is_default: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_variant_templatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductTemplate> {
    // Extract properties from the first productVariant (assuming all are identical)
    // This is the only way to get category_id, is_active etc. since they're not at template level
    const productVariants: Array<any> = Array.isArray(input.productVariant)
      ? input.productVariant
      : input.productVariant
        ? [input.productVariant]
        : [];
    const firstVariant = productVariants[0];
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      is_active: firstVariant?.is_active ?? undefined,
      is_visible_to_customers:
        firstVariant?.is_visible_to_customers ?? undefined,
      is_default: firstVariant?.is_default ?? undefined,
      sort_order: firstVariant?.sort_order ?? undefined,
      category_id: firstVariant?.category_id,
      attributes: await ArrayUtil.asyncMap(productVariants, (attribute) =>
        ShoppingMallProductVariantAttributeTransformer.transform(attribute),
      ),
    };
  }
}
