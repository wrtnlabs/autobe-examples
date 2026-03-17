import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantOptionTransformer {
  export type Payload = Prisma.shopping_mall_product_variant_optionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_variant_id: true,
        key: true,
        value: true,
        sequence: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_product_variant_optionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantOption> {
    return {
      id: input.id,
      product_variant_id: input.product_variant_id,
      key: input.key,
      value: input.value,
      sequence: input.sequence,
      created_at: input.created_at.toISOString(),
    };
  }
}
