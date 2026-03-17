import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price: true,
        stock_quantity: true,
        variantOptions: {
          select: {
            key: true,
            value: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariant.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price: input.price ?? null,
      stock_quantity: input.stock_quantity,
      option_values: Object.fromEntries(
        input.variantOptions.map((option) => [option.key, option.value]),
      ),
    };
  }
}
