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
    week_start_date:
      input?.week_start_date ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
