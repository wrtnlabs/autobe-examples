import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_mall_platform_product_variant(
  input?: DeepPartial<IMallPlatformProductVariant.ICreate> | undefined,
): IMallPlatformProductVariant.ICreate {
  return {
    skuCode:
      input?.skuCode ?? `SKU-${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
    optionValues:
      input?.optionValues ??
      RandomGenerator.pick([
        `Red / Large`,
        `Blue / Small`,
        `Black / Medium`,
        `White / One Size`,
      ] as const),
    priceOverride:
      input?.priceOverride === undefined
        ? typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<999999>
          >()
        : input.priceOverride,
  };
}
