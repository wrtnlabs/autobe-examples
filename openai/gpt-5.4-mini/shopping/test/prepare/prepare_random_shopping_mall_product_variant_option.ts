import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_variant_option(
  input?: DeepPartial<IShoppingMallProductVariantOption.ICreate> | undefined,
): IShoppingMallProductVariantOption.ICreate {
  return {
    option_name: input?.option_name ?? RandomGenerator.name(1),
    option_value: input?.option_value ?? RandomGenerator.name(1),
  };
}
