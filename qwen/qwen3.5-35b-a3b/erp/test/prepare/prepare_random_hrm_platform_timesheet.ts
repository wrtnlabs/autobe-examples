import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_timesheet(
  input?: DeepPartial<IHrmPlatformTimesheet.ICreate>,
): IHrmPlatformTimesheet.ICreate {
  return {
    start_date:
      input?.start_date ??
      RandomGenerator.date(
        new Date(2026, 0, 1),
        1000 * 60 * 60 * 24 * 365,
      ).toISOString(),
    end_date:
      input?.end_date ??
      RandomGenerator.date(
        new Date(2026, 0, 7),
        1000 * 60 * 60 * 24 * 365,
      ).toISOString(),
    hrm_platform_employee_id:
      input?.hrm_platform_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
