import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceProductVariantOptionTransformer {
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
        variant: true,
      },
    } satisfies Prisma.ecommerce_product_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceProductVariantOption> {
    return {
      key: input.option_key,
      value: input.option_value,
    };
  }
}
