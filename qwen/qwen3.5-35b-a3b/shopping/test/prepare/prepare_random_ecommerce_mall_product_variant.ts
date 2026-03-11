import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_product_variant(
  input?: DeepPartial<IEcommerceMallProductVariant.ICreate>,
): IEcommerceMallProductVariant.ICreate {
  return {
    sku_code: input?.sku_code ?? typia.random<string & tags.MaxLength<50>>(),
    option_values: input?.option_values
      ? Object.fromEntries(
          Object.entries(input.option_values).map(([key, value]) => [
            key,
            value ?? RandomGenerator.alphaNumeric(8),
          ]),
        )
      : {
          size: RandomGenerator.alphaNumeric(8),
          color: RandomGenerator.alphaNumeric(8),
        },
    stock_quantity:
      input?.stock_quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    price_override:
      input?.price_override ?? typia.random<number | null>() ?? null,
  };
}
