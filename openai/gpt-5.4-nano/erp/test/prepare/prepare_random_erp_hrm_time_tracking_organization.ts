import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_organization(
  input?: DeepPartial<IErpHrmTimeTrackingOrganization.ICreate> | undefined,
): IErpHrmTimeTrackingOrganization.ICreate {
  return {
    name:
      input?.name ??
      `${RandomGenerator.name(2)} ${RandomGenerator.alphabets(6)}`,
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
        wordMin: 3,
        wordMax: 8,
      }),
    logo_url: input?.logo_url ?? null,
    currency_code:
      input?.currency_code ??
      typia.random<string & tags.Pattern<"^[A-Z]{3}$">>(),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "America/New_York",
        "Europe/London",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
