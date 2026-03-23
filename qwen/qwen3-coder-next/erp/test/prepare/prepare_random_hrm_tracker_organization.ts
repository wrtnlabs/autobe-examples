import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_tracker_organization(
  input?: DeepPartial<IHrmTrackerOrganization.ICreate>,
): IHrmTrackerOrganization.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    logo_image_uri:
      input?.logo_image_uri ?? typia.random<string & tags.Format<"uri">>(),
    currency:
      input?.currency ??
      RandomGenerator.pick(["USD", "KRW", "EUR", "JPY", "GBP"] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "America/New_York",
        "Europe/London",
        "UTC",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
