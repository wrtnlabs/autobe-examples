import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_organization(
  input?: DeepPartial<IErpHrmOrganization.ICreate>,
): IErpHrmOrganization.ICreate {
  return {
    currency:
      input?.currency ??
      RandomGenerator.pick(["USD", "EUR", "KRW", "GBP", "JPY", "CNY"] as const),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    fiscalStartMonth:
      input?.fiscalStartMonth ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
    logoUri:
      input?.logoUri ??
      (typia.random<boolean>()
        ? typia.random<string & tags.Format<"uri">>()
        : null),
    name: input?.name ?? RandomGenerator.name(3),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "Australia/Sydney",
        "America/Los_Angeles",
      ] as const),
  };
}
