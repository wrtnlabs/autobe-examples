import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall product variant option value creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProductVariantOptionValue.ICreate with randomized
 * option key and value. The key is randomly selected from common option dimension names
 * such as "color", "size", or "material", and the value is a single random word
 * representing the specific attribute.
 *
 * Option values define the distinguishing attributes of a variant — such as color,
 * size, or material — that customers use to select the specific configuration they
 * want. Each option value consists of a key (the dimension name) and a value (the
 * specific attribute). A variant can have multiple option values, one per unique key.
 *
 * @param input Optional DeepPartial override for test-time customization
 * @returns Fully populated IShoppingMallProductVariantOptionValue.ICreate
 */
export function prepare_random_shopping_mall_product_variant_option_value(
  input?: DeepPartial<IShoppingMallProductVariantOptionValue.ICreate>,
): IShoppingMallProductVariantOptionValue.ICreate {
  return {
    key:
      input?.key ??
      RandomGenerator.pick([
        "color",
        "size",
        "material",
        "style",
        "capacity",
        "weight",
        "flavor",
      ] as const),
    value: input?.value ?? RandomGenerator.name(1),
  };
}
