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
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    logoImage: input?.logoImage ?? typia.random<string & tags.Format<"url">>(),
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
    fiscalStartMonth:
      input?.fiscalStartMonth ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
