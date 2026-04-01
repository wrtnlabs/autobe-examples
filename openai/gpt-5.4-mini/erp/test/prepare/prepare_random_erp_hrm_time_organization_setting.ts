import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_organization_setting(
  input?: DeepPartial<IErpHrmTimeOrganizationSetting.ICreate> | undefined,
): IErpHrmTimeOrganizationSetting.ICreate {
  return {
    currencyCode:
      input?.currencyCode ??
      RandomGenerator.pick(["USD", "EUR", "KRW", "JPY", "GBP"] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
      ] as const),
    fiscalStartMonth:
      input?.fiscalStartMonth ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
