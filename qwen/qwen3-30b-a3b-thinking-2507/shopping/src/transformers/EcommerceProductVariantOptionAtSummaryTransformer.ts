import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceProductVariantAtSummaryTransformer } from "./EcommerceProductVariantAtSummaryTransformer";

export namespace EcommerceProductVariantOptionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_product_variant_optionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        option_key: true,
        option_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        variant: EcommerceProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_product_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductVariantOption.ISummary> {
    return {
      id: input.id,
      option_key: input.option_key,
      option_value: input.option_value,
      variant: await EcommerceProductVariantAtSummaryTransformer.transform(
        input.variant,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
