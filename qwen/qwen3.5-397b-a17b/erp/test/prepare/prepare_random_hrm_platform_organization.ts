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
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    logo_url: input?.logo_url ?? typia.random<string & tags.Format<"url">>(),
    currency:
      input?.currency ??
      RandomGenerator.pick(["USD", "EUR", "KRW", "JPY", "GBP"] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "America/Los_Angeles",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
