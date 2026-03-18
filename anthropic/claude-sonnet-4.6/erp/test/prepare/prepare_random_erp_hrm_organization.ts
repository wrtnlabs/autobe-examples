import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_organization(
  input?: DeepPartial<IErpHrmOrganization.ICreate> | undefined,
): IErpHrmOrganization.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 2 }),
    logo_url:
      input?.logo_url !== undefined
        ? input.logo_url
        : typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
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
        "Asia/Seoul",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "America/Los_Angeles",
        "Europe/Paris",
        "Australia/Sydney",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
