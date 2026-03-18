import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_organization(
  input?: DeepPartial<IHrmTimeTrackingOrganization.ICreate> | undefined,
): IHrmTimeTrackingOrganization.ICreate {
  return {
    name:
      input?.name ??
      `${RandomGenerator.name(2)} ${RandomGenerator.pick(["Workspace", "Team", "Organization", "Group"] as const)}`,
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri:
      input?.logo_uri !== undefined
        ? input.logo_uri
        : typia.random<string & tags.Format<"uri">>(),
    currency_code:
      input?.currency_code ??
      RandomGenerator.pick(["USD", "KRW", "JPY", "EUR", "GBP", "SGD"] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "Asia/Tokyo",
        "UTC",
        "America/New_York",
        "Europe/London",
        "Asia/Singapore",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
