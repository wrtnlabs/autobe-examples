import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timesheet(
  input?: DeepPartial<IErpHrmTimesheet.ICreate>,
): IErpHrmTimesheet.ICreate {
  return {
    week_start_date:
      input?.week_start_date ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
