import { IEcommerceProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_product_variant_option(
  input?: DeepPartial<IEcommerceProductVariantOption.ICreate>,
): IEcommerceProductVariantOption.ICreate {
  return {
    option_key: input?.option_key ?? RandomGenerator.name(),
    option_value: input?.option_value ?? RandomGenerator.name(),
  };
}
