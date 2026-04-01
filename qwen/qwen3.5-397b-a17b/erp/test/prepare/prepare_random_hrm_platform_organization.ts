import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_organization(
  input?: DeepPartial<IHrmPlatformOrganization.ICreate>,
): IHrmPlatformOrganization.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 4 }),
    description:
      input?.description ??
      (typia.random<boolean>()
        ? RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          })
        : null),
    logo:
      input?.logo ??
      (typia.random<boolean>()
        ? typia.random<string & tags.Format<"url">>()
        : null),
    currency:
      input?.currency ??
      RandomGenerator.pick([
        "USD",
        "EUR",
        "KRW",
        "JPY",
        "GBP",
        "CNY",
        "AUD",
        "CAD",
      ] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "America/New_York",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Paris",
        "Asia/Seoul",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Australia/Sydney",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
