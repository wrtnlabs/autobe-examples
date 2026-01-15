import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallVariantTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantTemplate";
import { IShoppingMallVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAttribute";
import { IShoppingMallVariantCompatibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantCompatibility";
import { IShoppingMallVariantTemplateDefaultValues } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantTemplateDefaultValues";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallVariantAttributeTransformer } from "./ShoppingMallVariantAttributeTransformer";
import { ShoppingMallVariantCompatibilityTransformer } from "./ShoppingMallVariantCompatibilityTransformer";

export namespace ShoppingMallVariantTemplateTransformer {
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
            shopping_mall_product_variant_attributes:
              ShoppingMallVariantAttributeTransformer.select(),
            shopping_mall_product_variant_compatibilities:
              ShoppingMallVariantCompatibilityTransformer.select(),
          },
        },
        default_values: true,
      },
    } satisfies Prisma.shopping_mall_variant_templatesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantTemplate> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      attributes: await ArrayUtil.asyncMap(
        input.productVariant.shopping_mall_product_variant_attributes,
        (attr) => ShoppingMallVariantAttributeTransformer.transform(attr),
      ),
      compatibility_rules: await ArrayUtil.asyncMap(
        input.productVariant.shopping_mall_product_variant_compatibilities,
        (rule) => ShoppingMallVariantCompatibilityTransformer.transform(rule),
      ),
      default_values: input.default_values,
    };
  }
}
