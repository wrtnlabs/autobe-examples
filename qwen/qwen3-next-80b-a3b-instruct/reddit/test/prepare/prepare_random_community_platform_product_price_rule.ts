import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductPriceRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPriceRule";
export function prepare_random_community_platform_product_price_rule(
  input?: DeepPartial<ICommunityPlatformProductPriceRule.ICreate> | undefined,
): ICommunityPlatformProductPriceRule.ICreate {
  const ruleType =
    input?.ruleType ??
    RandomGenerator.pick([
      "FIXED_PRICE",
      "PERCENTAGE_DISCOUNT",
      "QUANTITY_BUCKET",
    ] as const);
  const startDate =
    input?.startDate ??
    RandomGenerator.date(new Date(), 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\..+/, "");
  return {
    productCode:
      input?.productCode ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<15>
        >(),
      ),
    ruleType: ruleType,
    value:
      input?.value ??
      (ruleType === "PERCENTAGE_DISCOUNT"
        ? typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
          >()
        : typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<0> &
              tags.Maximum<999999>
          >()),
    minQuantity:
      input?.minQuantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
    maxQuantity:
      input?.maxQuantity ??
      (() => {
        const max = typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
        >();
        return max >= (input?.minQuantity ?? 0)
          ? max
          : (input?.minQuantity ?? 0) +
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<1> &
                  tags.Maximum<10>
              >();
      })(),
    startDate: startDate,
    endDate:
      input?.endDate ??
      RandomGenerator.pick([
        null,
        RandomGenerator.date(new Date(startDate), 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace(/\..+/, ""),
      ] as const),
    priority:
      input?.priority ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
    description:
      input?.description ??
      RandomGenerator.pick([
        null,
        RandomGenerator.paragraph({
          sentences: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
          >(),
          wordMin: 3,
          wordMax: 7,
        }),
      ] as const),
  };
}
