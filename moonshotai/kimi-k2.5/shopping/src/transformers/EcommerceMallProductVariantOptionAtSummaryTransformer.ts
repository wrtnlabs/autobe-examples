import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantOptionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_product_variant_optionsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariantOption.ISummary> {
    return {
      id: input.id,
      optionName: input.option_name,
      optionValue: input.option_value,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        option_name: true,
        option_value: true,
      },
    } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs;
  }
}
