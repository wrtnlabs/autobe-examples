import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_report_employee_filter(
  input?: DeepPartial<IHrmTimeTrackingReportEmployeeFilter.ICreate>,
): IHrmTimeTrackingReportEmployeeFilter.ICreate {
  return {
    hrm_time_tracking_employee_id:
      input?.hrm_time_tracking_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
