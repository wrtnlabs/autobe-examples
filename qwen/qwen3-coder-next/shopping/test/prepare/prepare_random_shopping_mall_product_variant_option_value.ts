import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant_option_value(
  input?: DeepPartial<IShoppingMallProductVariantOptionValue.ICreate>,
): IShoppingMallProductVariantOptionValue.ICreate {
  return {
    option_name:
      input?.option_name ?? RandomGenerator.paragraph({ sentences: 1 }),
    option_value:
      input?.option_value ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
