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
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    logoImageUrl:
      input?.logoImageUrl ?? typia.random<string & tags.Format<"url">>(),
    currency:
      input?.currency ??
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
