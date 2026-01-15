import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
export function prepare_random_community_platform_product_price(
  input?: DeepPartial<ICommunityPlatformProductPrice.ICreate>,
): ICommunityPlatformProductPrice.ICreate {
  return {
    product_code: input?.product_code ?? RandomGenerator.alphaNumeric(12),
    currency_code:
      input?.currency_code ??
      typia.random<string & tags.Pattern<"^[A-Z]{3}$">>(),
    amount:
      input?.amount ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<10000>>(),
    effective_from:
      input?.effective_from ??
      typia.random<string & tags.Format<"date-time">>(),
    effective_to:
      input?.effective_to ??
      (typia.random<boolean>()
        ? typia.random<string & tags.Format<"date-time">>()
        : undefined),
    quantity_min:
      input?.quantity_min ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    quantity_max:
      input?.quantity_max ??
      (typia.random<boolean>()
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>()
        : undefined),
    notes:
      input?.notes ??
      (RandomGenerator.pick([true, false] as const)
        ? RandomGenerator.paragraph({
            sentences: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          })
        : undefined),
    source:
      input?.source ??
      RandomGenerator.pick([
        "ManualEntry",
        "SupplierFeed",
        "MarketplaceSync",
        "CompetitorPriceScan",
      ] as const),
    region:
      input?.region ??
      RandomGenerator.pick([
        "Global",
        "North America",
        "Europe",
        "Asia-Pacific",
        "Latin America",
        "Middle East",
        "Africa",
      ] as const),
    price_type:
      input?.price_type ??
      RandomGenerator.pick([
        "retail",
        "wholesale",
        "bulk",
        "membership",
        "promotional",
        "clearance",
      ] as const),
    tax_rate:
      input?.tax_rate ??
      (typia.random<boolean>()
        ? typia.random<number & tags.Minimum<0> & tags.Maximum<1>>()
        : undefined),
    unit:
      input?.unit ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
        wordMin: 1,
        wordMax: 3,
      }),
  };
}