import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_timesheet(
  input?: DeepPartial<IHrmsTimesheet.ICreate>,
): IHrmsTimesheet.ICreate {
  return {
    week_start_date:
      input?.week_start_date ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
