import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRefund";
export function prepare_random_community_platform_refund(
  input?: DeepPartial<ICommunityPlatformRefund.ICreate>,
): ICommunityPlatformRefund.ICreate {
  return {
    saleId: typia.random<string & tags.Format<"uuid">>(),
    amount:
      input?.amount ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
      >(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    currency:
      input?.currency ??
      RandomGenerator.pick([
        "USD",
        "EUR",
        "JPY",
        "GBP",
        "CAD",
        "AUD",
        "CHF",
        "CNY",
        "INR",
        "BRL",
      ] as const),
  };
}
