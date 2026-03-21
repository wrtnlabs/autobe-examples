import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantOptionValueTransformer {
  export type Payload =
    Prisma.ecommerce_mall_product_variant_option_valuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            quantity: true,
            created_at: true,
            optionValues: {
              select: {
                id: true,
                key: true,
                value: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_product_variant_option_valuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantOptionValue> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      variant: {
        created_at: toISOStringSafe(input.productVariant.created_at),
        id: input.productVariant.id,
        optionValues: input.productVariant.optionValues.map((ov) => ({
          id: ov.id,
          key: ov.key,
          value: ov.value,
          variant: {
            id: input.productVariant.id,
            created_at: toISOStringSafe(input.productVariant.created_at),
            optionValues: [],
            price: input.productVariant.price ?? null,
            quantity: input.productVariant.quantity,
            sku_code: input.productVariant.sku_code,
          },
          created_at: toISOStringSafe(ov.created_at),
          updated_at: toISOStringSafe(ov.updated_at),
        })),
        price: input.productVariant.price ?? null,
        quantity: input.productVariant.quantity,
        sku_code: input.productVariant.sku_code,
      },
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
